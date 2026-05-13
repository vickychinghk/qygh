import {
  copyFile,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, extname, join, parse } from "node:path";
import heicConvert from "heic-convert";
import sharp from "sharp";

export const SHORT_EDGE_TARGET = 1080;

export type AssetKind = "IMAGE" | "GIF" | "VIDEO" | "UNSUPPORTED";
export type ProcessingStatus = "READY" | "UNSUPPORTED" | "FAILED";
export type AssetSource = "feishu" | "manual" | "legacy";

export type NormalizedAsset = {
  localPath: string;
  originalPath: string | null;
  assetKind: AssetKind;
  width: number | null;
  height: number | null;
  bytes: number;
  originalBytes: number;
  processedBytes: number | null;
  originalFormat: string | null;
  processedFormat: string | null;
  mimeType: string | null;
  processingStatus: ProcessingStatus;
  processingError: string | null;
};

export type NormalizeAssetInput = {
  buffer: Buffer;
  fileName: string;
  publicRoot?: string;
  remoteMimeType?: string | null;
  source: AssetSource;
  token: string;
};

type AssetPathsInput = {
  source: AssetSource;
  token: string;
  fileName: string;
  outputExtension: string;
};

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "avi", "webm"]);

export function buildAssetPaths({
  source,
  token,
  fileName,
  outputExtension,
}: AssetPathsInput) {
  const safeSource = sanitizePathPart(source);
  const safeToken = sanitizePathPart(token);
  const originalName = sanitizeFileName(basename(fileName)) || "asset";
  const parsed = parse(originalName);
  const safeBase = parsed.name || "asset";
  const originalPath = `/uploads/originals/${safeSource}/${safeToken}-${originalName}`;
  const processedPath = `/uploads/processed/${safeSource}/${safeToken}-${safeBase}.${outputExtension}`;

  return { originalPath, processedPath };
}

export async function normalizeAssetBuffer({
  buffer,
  fileName,
  publicRoot = join(process.cwd(), "public"),
  remoteMimeType,
  source,
  token,
}: NormalizeAssetInput): Promise<NormalizedAsset> {
  const originalFormatHint = formatHint(fileName, remoteMimeType);

  if (isVideoAsset(fileName, remoteMimeType)) {
    const { originalPath } = buildAssetPaths({
      source,
      token,
      fileName,
      outputExtension: extensionOrDefault(fileName, "bin"),
    });
    await writePublicFile(publicRoot, originalPath, buffer);
    return {
      localPath: originalPath,
      originalPath,
      assetKind: "VIDEO",
      width: null,
      height: null,
      bytes: buffer.byteLength,
      originalBytes: buffer.byteLength,
      processedBytes: null,
      originalFormat: originalFormatHint,
      processedFormat: null,
      mimeType: remoteMimeType ?? null,
      processingStatus: "UNSUPPORTED",
      processingError: "暂不支持视频",
    };
  }

  if (isGifAsset(fileName, remoteMimeType)) {
    const { originalPath, processedPath } = buildAssetPaths({
      source,
      token,
      fileName,
      outputExtension: "gif",
    });
    await writePublicFile(publicRoot, originalPath, buffer);
    await writePublicFile(publicRoot, processedPath, buffer);
    const metadata = await readMetadata(buffer).catch(() => null);
    const processedBytes = await publicFileSize(publicRoot, processedPath);
    return {
      localPath: processedPath,
      originalPath,
      assetKind: "GIF",
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      bytes: processedBytes,
      originalBytes: buffer.byteLength,
      processedBytes,
      originalFormat: "gif",
      processedFormat: "gif",
      mimeType: "image/gif",
      processingStatus: "READY",
      processingError: null,
    };
  }

  const originalPath = buildAssetPaths({
    source,
    token,
    fileName,
    outputExtension: extensionOrDefault(fileName, "bin"),
  }).originalPath;
  await writePublicFile(publicRoot, originalPath, buffer);

  try {
    let transformBuffer = buffer;
    let metadata = await sharp(transformBuffer, { animated: false }).metadata();
    const originalFormat = metadata.format ?? originalFormatHint;
    const outputExtension = shouldKeepPng(fileName, remoteMimeType) ? "png" : "jpg";
    const { processedPath } = buildAssetPaths({
      source,
      token,
      fileName,
      outputExtension,
    });

    let output: Buffer;
    try {
      output = await renderProcessedImage(transformBuffer, metadata, outputExtension);
    } catch (error) {
      if (
        outputExtension !== "jpg" ||
        !shouldTrySystemJpegDecode(error, originalFormat, fileName, remoteMimeType)
      ) {
        throw error;
      }

      transformBuffer = await decodeHeifWithNode(buffer);
      metadata = await sharp(transformBuffer, { animated: false }).metadata();
      output = await renderProcessedImage(transformBuffer, metadata, outputExtension);
    }

    await writePublicFile(publicRoot, processedPath, output);
    const processedMetadata = await sharp(output).metadata();

    return {
      localPath: processedPath,
      originalPath,
      assetKind: "IMAGE",
      width: processedMetadata.width ?? metadata.width ?? null,
      height: processedMetadata.height ?? metadata.height ?? null,
      bytes: output.byteLength,
      originalBytes: buffer.byteLength,
      processedBytes: output.byteLength,
      originalFormat,
      processedFormat: outputExtension,
      mimeType: outputExtension === "png" ? "image/png" : "image/jpeg",
      processingStatus: "READY",
      processingError: null,
    };
  } catch (error) {
    return {
      localPath: originalPath,
      originalPath,
      assetKind: "UNSUPPORTED",
      width: null,
      height: null,
      bytes: buffer.byteLength,
      originalBytes: buffer.byteLength,
      processedBytes: null,
      originalFormat: originalFormatHint,
      processedFormat: null,
      mimeType: remoteMimeType ?? null,
      processingStatus: "FAILED",
      processingError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function renderProcessedImage(
  buffer: Buffer,
  metadata: sharp.Metadata,
  outputExtension: "jpg" | "png",
) {
  const resize = resizedDimensions(metadata.width, metadata.height);
  let pipeline = sharp(buffer, { animated: false }).rotate();
  if (resize) {
    pipeline = pipeline.resize(resize);
  }

  return outputExtension === "png"
    ? pipeline
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: false,
        })
        .toBuffer()
    : pipeline
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
}

async function decodeHeifWithNode(buffer: Buffer) {
  const output = await heicConvert({
    buffer,
    format: "JPEG",
    quality: 1,
  });

  return Buffer.isBuffer(output) ? output : Buffer.from(new Uint8Array(output));
}

export function shouldTrySystemJpegDecode(
  error: unknown,
  originalFormat: string | null,
  fileName: string,
  remoteMimeType: string | null | undefined,
) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error);
  const extension = extensionOrDefault(fileName, "");

  return (
    originalFormat === "heif" ||
    remoteMimeType?.toLowerCase().includes("heic") ||
    remoteMimeType?.toLowerCase().includes("heif") ||
    extension === "heic" ||
    extension === "heif" ||
    message.includes("heif") ||
    message.includes("heic")
  );
}

export async function normalizeExistingPublicAsset({
  currentPath,
  fileName,
  publicRoot = join(process.cwd(), "public"),
  remoteMimeType,
  source,
  token,
}: Omit<NormalizeAssetInput, "buffer"> & {
  currentPath: string;
}) {
  const buffer = await readFile(join(publicRoot, currentPath));
  const normalized = await normalizeAssetBuffer({
    buffer,
    fileName,
    publicRoot,
    remoteMimeType,
    source,
    token,
  });

  if (normalized.originalPath && normalized.originalPath !== currentPath) {
    await copyIfMissing(publicRoot, currentPath, normalized.originalPath);
  }

  return normalized;
}

function resizedDimensions(width?: number, height?: number) {
  if (!width || !height) {
    return null;
  }

  const shortEdge = Math.min(width, height);
  if (shortEdge <= SHORT_EDGE_TARGET) {
    return null;
  }

  const scale = SHORT_EDGE_TARGET / shortEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    fit: "inside" as const,
    withoutEnlargement: true,
  };
}

function shouldKeepPng(fileName: string, remoteMimeType: string | null | undefined) {
  return (
    extensionOrDefault(fileName, "") === "png" ||
    remoteMimeType?.toLowerCase() === "image/png"
  );
}

function isGifAsset(fileName: string, remoteMimeType: string | null | undefined) {
  return extensionOrDefault(fileName, "") === "gif" || remoteMimeType === "image/gif";
}

function isVideoAsset(fileName: string, remoteMimeType: string | null | undefined) {
  const extension = extensionOrDefault(fileName, "");
  return (
    VIDEO_EXTENSIONS.has(extension) ||
    Boolean(remoteMimeType?.toLowerCase().startsWith("video/"))
  );
}

function formatHint(fileName: string, remoteMimeType: string | null | undefined) {
  return (
    remoteMimeType?.split("/").pop()?.replace("+xml", "").toLowerCase() ||
    extensionOrDefault(fileName, "") ||
    null
  );
}

function extensionOrDefault(fileName: string, fallback: string) {
  return extname(fileName).replace(".", "").toLowerCase() || fallback;
}

async function readMetadata(buffer: Buffer) {
  return sharp(buffer, { animated: true }).metadata();
}

async function writePublicFile(publicRoot: string, publicPath: string, buffer: Buffer) {
  const filePath = join(publicRoot, publicPath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

async function publicFileSize(publicRoot: string, publicPath: string) {
  return (await stat(join(publicRoot, publicPath))).size;
}

async function copyIfMissing(
  publicRoot: string,
  fromPublicPath: string,
  toPublicPath: string,
) {
  try {
    await stat(join(publicRoot, toPublicPath));
  } catch {
    await mkdir(dirname(join(publicRoot, toPublicPath)), { recursive: true });
    await copyFile(join(publicRoot, fromPublicPath), join(publicRoot, toPublicPath));
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.-]+/g, "-").replace(/^\.+/, "");
}

function sanitizePathPart(value: string) {
  return value.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}
