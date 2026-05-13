import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildAssetPaths,
  normalizeAssetBuffer,
  SHORT_EDGE_TARGET,
} from "@/lib/image-pipeline";

describe("buildAssetPaths", () => {
  it("creates stable original and processed paths without trusting unsafe names", () => {
    expect(
      buildAssetPaths({
        source: "feishu",
        token: "token-123",
        fileName: "../IMG 4106.HEIC",
        outputExtension: "jpg",
      }),
    ).toEqual({
      originalPath: "/uploads/originals/feishu/token-123-IMG-4106.HEIC",
      processedPath: "/uploads/processed/feishu/token-123-IMG-4106.jpg",
    });
  });
});

describe("normalizeAssetBuffer", () => {
  it("converts HEIF-like and photo formats to a short-edge 1080 JPEG", async () => {
    const root = await mkdtemp(join(tmpdir(), "mihuo-image-pipeline-"));
    const input = await sharp({
      create: {
        width: 4096,
        height: 3072,
        channels: 3,
        background: "#fd80c2",
      },
    })
      .png()
      .toBuffer();

    const result = await normalizeAssetBuffer({
      buffer: input,
      fileName: "IMG_4106.HEIC",
      publicRoot: root,
      remoteMimeType: "image/heic",
      source: "feishu",
      token: "S2N",
    });

    expect(result.assetKind).toBe("IMAGE");
    expect(result.processingStatus).toBe("READY");
    expect(result.processedFormat).toBe("jpg");
    expect(result.width).toBe(1440);
    expect(result.height).toBe(SHORT_EDGE_TARGET);
    expect(result.localPath).toBe("/uploads/processed/feishu/S2N-IMG_4106.jpg");
    expect(result.originalPath).toBe("/uploads/originals/feishu/S2N-IMG_4106.HEIC");

    const output = await sharp(join(root, result.localPath)).metadata();
    expect(output.format).toBe("jpeg");
    expect(output.width).toBe(1440);
    expect(output.height).toBe(SHORT_EDGE_TARGET);
  });

  it("keeps submitted PNG as optimized PNG and preserves alpha", async () => {
    const root = await mkdtemp(join(tmpdir(), "mihuo-image-pipeline-"));
    const input = await sharp({
      create: {
        width: 900,
        height: 1400,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    const result = await normalizeAssetBuffer({
      buffer: input,
      fileName: "transparent.png",
      publicRoot: root,
      remoteMimeType: "image/png",
      source: "manual",
      token: "png-token",
    });

    expect(result.assetKind).toBe("IMAGE");
    expect(result.processedFormat).toBe("png");
    expect(result.width).toBe(900);
    expect(result.height).toBe(1400);
    expect(result.localPath).toBe(
      "/uploads/processed/manual/png-token-transparent.png",
    );
  });

  it("keeps GIF displayable without transcoding", async () => {
    const root = await mkdtemp(join(tmpdir(), "mihuo-image-pipeline-"));
    const gif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "base64",
    );

    const result = await normalizeAssetBuffer({
      buffer: gif,
      fileName: "motion.gif",
      publicRoot: root,
      remoteMimeType: "image/gif",
      source: "feishu",
      token: "gif-token",
    });

    expect(result.assetKind).toBe("GIF");
    expect(result.processingStatus).toBe("READY");
    expect(result.localPath).toBe(
      "/uploads/processed/feishu/gif-token-motion.gif",
    );
    expect(await readFile(join(root, result.localPath))).toEqual(gif);
  });

  it("stores video but marks it unsupported for image rendering", async () => {
    const root = await mkdtemp(join(tmpdir(), "mihuo-image-pipeline-"));
    const video = Buffer.from("fake video bytes");

    const result = await normalizeAssetBuffer({
      buffer: video,
      fileName: "clip.mov",
      publicRoot: root,
      remoteMimeType: "video/quicktime",
      source: "feishu",
      token: "video-token",
    });

    expect(result.assetKind).toBe("VIDEO");
    expect(result.processingStatus).toBe("UNSUPPORTED");
    expect(result.localPath).toBe(
      "/uploads/originals/feishu/video-token-clip.mov",
    );
    expect((await stat(join(root, result.localPath))).size).toBe(video.byteLength);
  });
});
