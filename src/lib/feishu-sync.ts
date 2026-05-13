import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  buildAssetPaths,
  normalizeAssetBuffer,
  type NormalizedAsset,
} from "@/lib/image-pipeline";
import { prisma } from "@/lib/prisma";
import { clearUserGeneratedData } from "@/lib/user-data-cleanup";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const MAX_IMAGE_DOWNLOADS_PER_SYNC = Number(
  process.env.FEISHU_MAX_IMAGE_DOWNLOADS ?? "1000",
);
let imageDownloadsThisSync = 0;

export type FeishuFieldMapping = {
  serialNumber: string;
  school: string;
  schoolOther: string;
  quote: string;
  consent: string;
  submittedAt: string;
  images: string;
};

export const DEFAULT_FEISHU_FIELD_MAPPING: FeishuFieldMapping = {
  serialNumber: "编号",
  school: "请问此条迷惑行为发生于哪所学校？",
  schoolOther: "请问此条迷惑行为发生于哪所学校？-其他-补充内容",
  quote: "感谢投稿，现在请您吐槽：",
  consent: "投稿时，是否已经征得当事人许可？",
  submittedAt: "投稿日期",
  images: "请上传您的投稿内容：",
};

type FeishuTextSegment = {
  text?: string;
  type?: string;
};

type FeishuAttachment = {
  file_token?: string;
  name?: string;
  size?: number;
  tmp_url?: string;
  type?: string;
  url?: string;
};

export type FeishuRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

export type FeishuSubmissionInput = {
  feishuRecordId: string;
  serialNumber: string | null;
  school: string;
  submitterQuote: string;
  consentGranted: boolean;
  submittedAt: Date;
  status: string;
};

export type FeishuSubmissionImageInput = {
  remoteUrl: string | null;
  tmpUrl: string | null;
  fileToken: string;
  fileName: string;
  remoteMimeType: string | null;
  localPath?: string;
  originalPath?: string | null;
  assetKind?: string;
  width?: number | null;
  height?: number | null;
  bytes: number | null;
  originalBytes?: number | null;
  processedBytes?: number | null;
  originalFormat?: string | null;
  processedFormat?: string | null;
  mimeType?: string | null;
  processingStatus?: string;
  processingError?: string | null;
  sortOrder: number;
};

type FeishuConfig = {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  viewId?: string;
  fieldMapping: FeishuFieldMapping;
};

export type FeishuSearchRequest = {
  query: Record<string, string>;
  body: {
    view_id?: string;
    sort?: Array<{ field_name: string; desc: boolean }>;
    filter?: {
      conjunction: "and";
      conditions: Array<{
        field_name: string;
        operator: "isGreater";
        value: Array<string | number>;
      }>;
    };
  };
};

type ImageCacheStatus =
  | "downloaded"
  | "existing"
  | "failed"
  | "skipped_limit"
  | "missing_remote_url";

export type ImageCacheResult = {
  status: ImageCacheStatus;
  error?: string;
  fileName?: string;
  fileToken?: string;
};

type CachedImageResult = {
  image: FeishuSubmissionImageInput;
  result: ImageCacheResult;
};

export type ImageCacheSummary = {
  attempted: number;
  downloaded: number;
  existing: number;
  failed: number;
  skipped: number;
};

export type FeishuImageHealthSummary = {
  checked: number;
  damaged: number;
  failed: number;
  missingFiles: number;
  unsupported: number;
  repairable: number;
};

type FeishuImageHealthInput = {
  id: string;
  localPath: string;
  originalPath: string | null;
  assetKind: string;
  processingStatus: string;
  bytes: number | null;
  remoteUrl: string | null;
};

export type FeishuSyncProgressEvent =
  | { type: "start"; jobId: string; cursorSubmittedAt: string | null }
  | { type: "page"; fetched: number; scanned: number }
  | { type: "record"; scanned: number; created: number; failed: number }
  | { type: "report"; report: FeishuSyncReport }
  | { type: "error"; message: string };

export type FeishuSyncReport = {
  jobId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  complete: boolean;
  scanned: number;
  created: number;
  updated: number;
  skippedExisting: number;
  failed: number;
  images: ImageCacheSummary;
  cursorSubmittedAt: Date | null;
  cursorSerialNumber: string | null;
  cursorRecordId: string | null;
  errors: string[];
};

type FeishuSyncOptions = {
  onProgress?: (event: FeishuSyncProgressEvent) => void | Promise<void>;
};

type FeishuListResponse<T> = {
  code: number;
  msg?: string;
  data?: {
    has_more?: boolean;
    page_token?: string;
    items?: T[];
    total?: number;
  };
};

type FeishuTokenResponse = {
  code: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
};

export function parseBitableUrl(url: string) {
  const parsed = new URL(url);
  const appToken = parsed.pathname.split("/").filter(Boolean).at(-1);
  const tableId = parsed.searchParams.get("table");
  const viewId = parsed.searchParams.get("view") ?? undefined;

  if (!appToken || !tableId) {
    throw new Error("Feishu Bitable URL must include app token and table id.");
  }

  return { appToken, tableId, viewId };
}

export function mapFeishuRecordToSubmission(
  record: FeishuRecord,
  mapping: FeishuFieldMapping = DEFAULT_FEISHU_FIELD_MAPPING,
) {
  const fields = record.fields;
  const school = normalizeCellText(fields[mapping.school]);
  const schoolOther = normalizeCellText(fields[mapping.schoolOther]);
  const displaySchool =
    school === "其他" && schoolOther ? `${school}：${schoolOther}` : school;

  const submission: FeishuSubmissionInput = {
    feishuRecordId: record.record_id,
    serialNumber: normalizeCellText(fields[mapping.serialNumber]) || null,
    school: displaySchool || "未填写学校",
    submitterQuote: normalizeCellText(fields[mapping.quote]) || "未填写吐槽",
    consentGranted: normalizeConsent(fields[mapping.consent]),
    submittedAt: normalizeDate(fields[mapping.submittedAt]) ?? new Date(),
    status: normalizeConsent(fields[mapping.consent]) ? "READY" : "PENDING",
  };

  const images = normalizeAttachments(fields[mapping.images]).map(
    (attachment, index) => {
      const token = attachment.file_token ?? `attachment-${index + 1}`;
      const fileName = sanitizeFileName(attachment.name ?? `${token}.jpg`);

      return {
        remoteUrl: attachment.url ?? attachment.tmp_url ?? null,
        tmpUrl: attachment.tmp_url ?? null,
        fileToken: token,
        fileName,
        remoteMimeType: attachment.type ?? null,
        bytes: attachment.size ?? null,
        sortOrder: index,
      };
    },
  );

  return { submission, images };
}

export async function syncFeishuSubmissions(options: FeishuSyncOptions = {}) {
  loadLocalEnv();
  imageDownloadsThisSync = 0;
  const config = readFeishuConfigFromEnv();
  const job = await prisma.syncJob.create({ data: { status: "RUNNING" } });

  const lastSuccessfulSync = await prisma.syncJob.findFirst({
    where: { status: "SUCCESS", cursorSubmittedAt: { not: null } },
    orderBy: { cursorSubmittedAt: "desc" },
  });
  const cursorSubmittedAt = lastSuccessfulSync?.cursorSubmittedAt ?? null;
  let created = 0;
  const updated = 0;
  let failed = 0;
  let scanned = 0;
  let skippedExisting = 0;
  let maxCursor: SyncCursor | null = lastSuccessfulSync
    ? {
        submittedAt: lastSuccessfulSync.cursorSubmittedAt,
        serialNumber: lastSuccessfulSync.cursorSerialNumber,
        recordId: lastSuccessfulSync.cursorRecordId,
      }
    : null;
  const errors: string[] = [];
  const imageResults: ImageCacheResult[] = [];

  await emitProgress(options, {
    type: "start",
    jobId: job.id,
    cursorSubmittedAt: cursorSubmittedAt?.toISOString() ?? null,
  });

  try {
    const token = await getTenantAccessToken(config);
    const records = await listBitableRecords(config, token, {
      cursorSubmittedAt,
      onPage: async (pageRecords) => {
        scanned += pageRecords.length;
        await emitProgress(options, {
          type: "page",
          fetched: pageRecords.length,
          scanned,
        });
      },
    });
    const existingRecords = await prisma.submission.findMany({
      where: {
        feishuRecordId: {
          in: records.map((record) => record.record_id),
        },
      },
      select: { id: true, feishuRecordId: true },
    });
    const existingByRecordId = new Map(
      existingRecords
        .filter((record) => record.feishuRecordId)
        .map((record) => [record.feishuRecordId as string, record.id]),
    );

    for (const record of records) {
      try {
        const { submission, images } = mapFeishuRecordToSubmission(
          record,
          config.fieldMapping,
        );
        maxCursor = pickMaxCursor(maxCursor, {
          submittedAt: submission.submittedAt,
          serialNumber: submission.serialNumber,
          recordId: submission.feishuRecordId,
        });

        const existingId = existingByRecordId.get(submission.feishuRecordId);
        if (existingId) {
          skippedExisting += 1;
          const retryResults = await cacheMissingExistingImages(existingId, token);
          imageResults.push(...retryResults);
          await emitProgress(options, { type: "record", scanned, created, failed });
          continue;
        }

        const cachedImages = await cacheFeishuImages(images, token);
        imageResults.push(...cachedImages.map((item) => item.result));
        errors.push(
          ...formatImageCacheErrors({
            recordId: submission.feishuRecordId,
            serialNumber: submission.serialNumber,
            results: cachedImages.map((item) => item.result),
          }),
        );
        await prisma.submission.create({
          data: {
            ...submission,
            images: {
              create: cachedImages.map((item) =>
                toSubmissionImageCreateInput(item.image),
              ),
            },
            comments: {
              create: {
                body: submission.submitterQuote,
                source: "SUBMITTER",
              },
            },
          },
        });
        created += 1;
        await emitProgress(options, { type: "record", scanned, created, failed });
      } catch (error) {
        failed += 1;
        errors.push(
          `${record.record_id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await emitProgress(options, { type: "record", scanned, created, failed });
      }
    }

    const images = summarizeImageCacheResults(imageResults);
    const complete = failed === 0 && images.failed === 0 && images.skipped === 0;
    const status = complete ? "SUCCESS" : "PARTIAL";
    const report: FeishuSyncReport = {
      jobId: job.id,
      status,
      complete,
      scanned,
      created,
      updated,
      skippedExisting,
      failed,
      images,
      cursorSubmittedAt: maxCursor?.submittedAt ?? null,
      cursorSerialNumber: maxCursor?.serialNumber ?? null,
      cursorRecordId: maxCursor?.recordId ?? null,
      errors,
    };

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status,
        finishedAt: new Date(),
        created,
        updated,
        failed,
        skipped: skippedExisting,
        scanned,
        imageAttempted: images.attempted,
        imageDownloaded: images.downloaded,
        imageExisting: images.existing,
        imageFailed: images.failed,
        imageSkipped: images.skipped,
        cursorSubmittedAt: report.cursorSubmittedAt,
        cursorSerialNumber: report.cursorSerialNumber,
        cursorRecordId: report.cursorRecordId,
        complete,
        details: JSON.stringify(report),
        error: errors.length ? errors.slice(0, 5).join("\n") : null,
      },
    });

    await emitProgress(options, { type: "report", report });
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const images = summarizeImageCacheResults(imageResults);
    const report: FeishuSyncReport = {
      jobId: job.id,
      status: "FAILED",
      complete: false,
      scanned,
      created,
      updated,
      skippedExisting,
      failed,
      images,
      cursorSubmittedAt: maxCursor?.submittedAt ?? null,
      cursorSerialNumber: maxCursor?.serialNumber ?? null,
      cursorRecordId: maxCursor?.recordId ?? null,
      errors: [...errors, message],
    };

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        created,
        updated,
        failed,
        skipped: skippedExisting,
        scanned,
        imageAttempted: images.attempted,
        imageDownloaded: images.downloaded,
        imageExisting: images.existing,
        imageFailed: images.failed,
        imageSkipped: images.skipped,
        cursorSubmittedAt: report.cursorSubmittedAt,
        cursorSerialNumber: report.cursorSerialNumber,
        cursorRecordId: report.cursorRecordId,
        complete: false,
        details: JSON.stringify(report),
        error: message,
      },
    });
    await emitProgress(options, { type: "error", message });
    throw error;
  }
}

export async function clearBusinessData() {
  await clearUserGeneratedData();
}

type SyncCursor = {
  submittedAt: Date | null;
  serialNumber: string | null;
  recordId: string | null;
};

function pickMaxCursor(current: SyncCursor | null, next: SyncCursor): SyncCursor {
  if (!current?.submittedAt) {
    return next;
  }
  if (!next.submittedAt) {
    return current;
  }
  if (next.submittedAt.getTime() > current.submittedAt.getTime()) {
    return next;
  }
  return current;
}

async function cacheMissingExistingImages(submissionId: string, token: string) {
  const images = await prisma.submissionImage.findMany({
    where: {
      submissionId,
      remoteUrl: { not: null },
    },
    select: {
      localPath: true,
      originalPath: true,
      remoteUrl: true,
      mimeType: true,
      bytes: true,
      sortOrder: true,
    },
  });
  const missing = images
    .filter(
      (image) =>
        isFeishuImagePath(image.localPath, image.originalPath) &&
        !existsSync(join(process.cwd(), "public", image.localPath)),
    )
    .map((image) => ({
      remoteUrl: image.remoteUrl,
      tmpUrl: null,
      fileToken: inferTokenFromPath(image.originalPath ?? image.localPath),
      fileName: basename(image.originalPath ?? image.localPath),
      remoteMimeType: image.mimeType,
      localPath: image.localPath,
      bytes: image.bytes,
      sortOrder: image.sortOrder,
    }));

  const cached = await cacheFeishuImages(missing, token);
  return cached.map((item) => item.result);
}

export function summarizeFeishuImageHealth(
  images: FeishuImageHealthInput[],
  publicFileExists: (path: string) => boolean = (path) =>
    existsSync(join(process.cwd(), "public", path)),
): FeishuImageHealthSummary {
  return images.reduce<FeishuImageHealthSummary>(
    (summary, image) => {
      if (!isFeishuImagePath(image.localPath, image.originalPath)) {
        return summary;
      }

      summary.checked += 1;
      const health = getFeishuImageHealth(image, publicFileExists);
      if (!health.damaged) {
        return summary;
      }

      summary.damaged += 1;
      if (health.failed) {
        summary.failed += 1;
      }
      if (health.missingFile) {
        summary.missingFiles += 1;
      }
      if (health.unsupported) {
        summary.unsupported += 1;
      }
      if (image.remoteUrl) {
        summary.repairable += 1;
      }
      return summary;
    },
    {
      checked: 0,
      damaged: 0,
      failed: 0,
      missingFiles: 0,
      unsupported: 0,
      repairable: 0,
    },
  );
}

export async function inspectDamagedFeishuImages() {
  const images = await prisma.submissionImage.findMany({
    select: {
      id: true,
      localPath: true,
      originalPath: true,
      assetKind: true,
      processingStatus: true,
      bytes: true,
      remoteUrl: true,
    },
  });

  return summarizeFeishuImageHealth(images);
}

export async function repairDamagedFeishuImages() {
  loadLocalEnv();
  imageDownloadsThisSync = 0;
  const config = readFeishuConfigFromEnv();
  const token = await getTenantAccessToken(config);
  const images = await prisma.submissionImage.findMany({
    where: { remoteUrl: { not: null } },
    select: {
      id: true,
      localPath: true,
      originalPath: true,
      assetKind: true,
      processingStatus: true,
      bytes: true,
      mimeType: true,
      remoteUrl: true,
      sortOrder: true,
    },
  });
  const damaged = images.filter((image) => {
    if (!isFeishuImagePath(image.localPath, image.originalPath)) {
      return false;
    }
    return getFeishuImageHealth(image).damaged;
  });

  let repaired = 0;
  const results: ImageCacheResult[] = [];

  for (const image of damaged) {
    const cached = await cacheFeishuImages(
      [
        {
          remoteUrl: image.remoteUrl,
          tmpUrl: null,
          fileToken: inferTokenFromPath(image.originalPath ?? image.localPath),
          fileName: basename(image.originalPath ?? image.localPath),
          remoteMimeType: image.mimeType,
          bytes: image.bytes,
          sortOrder: image.sortOrder,
        },
      ],
      token,
    );
    const item = cached[0];
    if (!item) {
      continue;
    }
    results.push(item.result);
    if (item.result.status !== "downloaded") {
      continue;
    }

    await prisma.submissionImage.update({
      where: { id: image.id },
      data: toSubmissionImageUpdateInput(item.image),
    });
    repaired += 1;
  }

  const summary = await inspectDamagedFeishuImages();
  return {
    before: summarizeFeishuImageHealth(images),
    after: summary,
    repaired,
    images: summarizeImageCacheResults(results),
  };
}

async function emitProgress(
  options: FeishuSyncOptions,
  event: FeishuSyncProgressEvent,
) {
  await options.onProgress?.(event);
}

export function buildBitableSearchRequest({
  cursorSubmittedAt,
  fieldMapping,
  pageSize,
  pageToken,
  viewId,
}: {
  cursorSubmittedAt?: Date | null;
  fieldMapping: FeishuFieldMapping;
  pageSize: number;
  pageToken?: string;
  viewId?: string;
}): FeishuSearchRequest {
  const query: Record<string, string> = { page_size: String(pageSize) };
  if (pageToken) {
    query.page_token = pageToken;
  }

  const body: FeishuSearchRequest["body"] = {
    ...(viewId ? { view_id: viewId } : {}),
    sort: [{ field_name: fieldMapping.submittedAt, desc: false }],
  };

  if (cursorSubmittedAt) {
    body.filter = {
      conjunction: "and",
      conditions: [
        {
          field_name: fieldMapping.submittedAt,
          operator: "isGreater",
          value: ["ExactDate", cursorSubmittedAt.getTime() - 1],
        },
      ],
    };
  }

  return { query, body };
}

export function filterNewFeishuRecords(
  records: FeishuRecord[],
  existingRecordIds: Set<string>,
) {
  const newRecords = records.filter(
    (record) => !existingRecordIds.has(record.record_id),
  );

  return {
    newRecords,
    skippedExisting: records.length - newRecords.length,
  };
}

export function summarizeImageCacheResults(
  results: ImageCacheResult[],
): ImageCacheSummary {
  return results.reduce<ImageCacheSummary>(
    (summary, result) => {
      summary.attempted += 1;
      if (result.status === "downloaded") {
        summary.downloaded += 1;
      } else if (result.status === "existing") {
        summary.existing += 1;
      } else if (result.status === "failed") {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }
      return summary;
    },
    { attempted: 0, downloaded: 0, existing: 0, failed: 0, skipped: 0 },
  );
}

function normalizeCellText(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }
        if (isTextSegment(item)) {
          return item.text ?? "";
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function normalizeConsent(value: unknown): boolean {
  const text = normalizeCellText(value);
  return text === "是" || text === "不涉及" || text.toLowerCase() === "true";
}

function normalizeDate(value: unknown): Date | null {
  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    const timestamp = Number(value);
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp);
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function normalizeAttachments(value: unknown): FeishuAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAttachment);
}

function isTextSegment(value: unknown): value is FeishuTextSegment {
  return typeof value === "object" && value !== null && "text" in value;
}

function isAttachment(value: unknown): value is FeishuAttachment {
  return typeof value === "object" && value !== null && "file_token" in value;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.-]+/g, "-");
}

async function cacheFeishuImages(
  images: FeishuSubmissionImageInput[],
  token: string,
): Promise<CachedImageResult[]> {
  ensureUploadDirectory();

  return Promise.all(
    images.map(async (image) => {
      if (!image.remoteUrl && !image.tmpUrl) {
        const failedImage = await persistFailedFeishuAsset(
          image,
          new Error("Missing remote URL."),
        );
        return {
          image: failedImage,
          result: {
            status: "missing_remote_url",
            error: "Missing remote URL.",
            fileName: image.fileName,
            fileToken: image.fileToken,
          },
        };
      }

      if (imageDownloadsThisSync >= MAX_IMAGE_DOWNLOADS_PER_SYNC) {
        return { image, result: { status: "skipped_limit" } };
      }
      imageDownloadsThisSync += 1;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const bytes = await downloadFeishuAsset(image, token, controller.signal);
        const normalized = await normalizeAssetBuffer({
          buffer: bytes,
          fileName: image.fileName,
          remoteMimeType: image.remoteMimeType,
          source: "feishu",
          token: image.fileToken,
        });
        const cachedImage = normalizedAssetToSubmissionImage(image, normalized);

        return {
          image: cachedImage,
          result: {
            status: "downloaded",
            fileName: image.fileName,
            fileToken: image.fileToken,
          },
        };
      } catch (error) {
        const failedImage = await persistFailedFeishuAsset(image, error);
        return {
          image: failedImage,
          result: {
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            fileName: image.fileName,
            fileToken: image.fileToken,
          },
        };
      } finally {
        clearTimeout(timeout);
      }
    }),
  );
}

function formatImageCacheErrors({
  recordId,
  results,
  serialNumber,
}: {
  recordId: string;
  serialNumber: string | null;
  results: ImageCacheResult[];
}) {
  return results
    .filter(
      (result) =>
        result.status === "failed" ||
        result.status === "missing_remote_url" ||
        result.status === "skipped_limit",
    )
    .map((result) => {
      const label = serialNumber ? `第 ${serialNumber} 条` : `record ${recordId}`;
      const file = result.fileName ?? result.fileToken ?? "未知附件";
      const reason = result.error ?? result.status;
      return `${label} 图片处理失败：${file}（${reason}）`;
    });
}

async function downloadFeishuAsset(
  image: FeishuSubmissionImageInput,
  token: string,
  signal: AbortSignal,
) {
  const urls = [image.remoteUrl, image.tmpUrl].filter(Boolean) as string[];
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (
        contentType.includes("application/json") ||
        url.includes("batch_get_tmp_download_url")
      ) {
        const data = (await response.json()) as {
          code?: number;
          msg?: string;
          data?: { tmp_download_urls?: Array<{ tmp_download_url?: string }> };
        };
        const tmpDownloadUrl = data.data?.tmp_download_urls?.[0]?.tmp_download_url;
        if (!tmpDownloadUrl) {
          throw new Error(data.msg ?? "Missing temporary download URL.");
        }
        const tmpResponse = await fetch(tmpDownloadUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!tmpResponse.ok) {
          throw new Error(String(tmpResponse.status));
        }
        return Buffer.from(await tmpResponse.arrayBuffer());
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Missing remote URL.");
}

function normalizedAssetToSubmissionImage(
  image: FeishuSubmissionImageInput,
  asset: NormalizedAsset,
): FeishuSubmissionImageInput {
  return {
    ...image,
    ...asset,
    remoteUrl: image.remoteUrl,
    sortOrder: image.sortOrder,
  };
}

function toSubmissionImageCreateInput(image: FeishuSubmissionImageInput) {
  return {
    remoteUrl: image.remoteUrl,
    localPath: image.localPath ?? "",
    originalPath: image.originalPath ?? null,
    assetKind: image.assetKind ?? "IMAGE",
    width: image.width ?? null,
    height: image.height ?? null,
    bytes: image.bytes,
    originalBytes: image.originalBytes ?? image.bytes ?? null,
    processedBytes: image.processedBytes ?? null,
    originalFormat: image.originalFormat ?? null,
    processedFormat: image.processedFormat ?? null,
    mimeType: image.mimeType ?? image.remoteMimeType ?? null,
    processingStatus: image.processingStatus ?? "READY",
    processingError: image.processingError ?? null,
    sortOrder: image.sortOrder,
  };
}

function toSubmissionImageUpdateInput(image: FeishuSubmissionImageInput) {
  return {
    remoteUrl: image.remoteUrl,
    localPath: image.localPath ?? "",
    originalPath: image.originalPath ?? null,
    assetKind: image.assetKind ?? "IMAGE",
    width: image.width ?? null,
    height: image.height ?? null,
    bytes: image.bytes,
    originalBytes: image.originalBytes ?? image.bytes ?? null,
    processedBytes: image.processedBytes ?? null,
    originalFormat: image.originalFormat ?? null,
    processedFormat: image.processedFormat ?? null,
    mimeType: image.mimeType ?? image.remoteMimeType ?? null,
    processingStatus: image.processingStatus ?? "READY",
    processingError: image.processingError ?? null,
  };
}

async function persistFailedFeishuAsset(
  image: FeishuSubmissionImageInput,
  error: unknown,
): Promise<FeishuSubmissionImageInput> {
  const message = error instanceof Error ? error.message : String(error);
  const failed = await normalizeAssetBuffer({
    buffer: Buffer.from(""),
    fileName: image.fileName,
    remoteMimeType: image.remoteMimeType,
    source: "feishu",
    token: image.fileToken,
  });

  return {
    ...image,
    localPath: failed.localPath,
    bytes: 0,
    assetKind: "UNSUPPORTED",
    width: null,
    height: null,
    originalPath: failed.originalPath,
    originalBytes: 0,
    processedBytes: null,
    originalFormat: image.remoteMimeType?.split("/").pop() ?? null,
    processedFormat: null,
    mimeType: image.remoteMimeType,
    processingStatus: "FAILED",
    processingError: message,
  } as FeishuSubmissionImageInput;
}

function predictProcessedPath(image: FeishuSubmissionImageInput) {
  const mime = image.remoteMimeType?.toLowerCase();
  const extension = image.fileName.split(".").pop()?.toLowerCase();
  const outputExtension =
    mime?.startsWith("video/") || ["mp4", "mov", "m4v", "avi", "webm"].includes(extension ?? "")
      ? extension || "bin"
      : mime === "image/gif" || extension === "gif"
        ? "gif"
        : mime === "image/png" || extension === "png"
          ? "png"
          : "jpg";

  return buildAssetPaths({
    source: "feishu",
    token: image.fileToken,
    fileName: image.fileName,
    outputExtension,
  }).processedPath;
}

function inferTokenFromPath(path: string) {
  return basename(path).split("-")[0] || crypto.randomUUID();
}

function isFeishuImagePath(localPath: string, originalPath?: string | null) {
  return localPath.includes("/feishu/") || Boolean(originalPath?.includes("/feishu/"));
}

function getFeishuImageHealth(
  image: FeishuImageHealthInput,
  publicFileExists: (path: string) => boolean = (path) =>
    existsSync(join(process.cwd(), "public", path)),
) {
  const paths = [image.localPath, image.originalPath].filter(Boolean) as string[];
  const missingFile = paths.some((path) => !publicFileExists(path));
  const failed = image.processingStatus === "FAILED";
  const unsupported = image.assetKind === "UNSUPPORTED";
  const empty = image.bytes === 0;

  return {
    damaged: failed || unsupported || missingFile || empty,
    failed,
    unsupported,
    missingFile,
  };
}

function loadLocalEnv() {
  for (const fileName of [".env", ".env.local"]) {
    const path = join(process.cwd(), fileName);
    if (!existsSync(path)) {
      continue;
    }

    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split("=");
      if (!key || process.env[key]) {
        continue;
      }

      process.env[key] = valueParts.join("=").replace(/^"|"$/g, "");
    }
  }
}

function readFeishuConfigFromEnv(): FeishuConfig {
  const appId = requiredEnv("FEISHU_APP_ID");
  const appSecret = requiredEnv("FEISHU_APP_SECRET");
  const appToken = requiredEnv("FEISHU_BITABLE_APP_TOKEN");
  const tableId = requiredEnv("FEISHU_BITABLE_TABLE_ID");

  return {
    appId,
    appSecret,
    appToken,
    tableId,
    viewId: process.env.FEISHU_BITABLE_VIEW_ID,
    fieldMapping: {
      serialNumber:
        process.env.FEISHU_FIELD_SERIAL_NUMBER ??
        DEFAULT_FEISHU_FIELD_MAPPING.serialNumber,
      school:
        process.env.FEISHU_FIELD_SCHOOL ?? DEFAULT_FEISHU_FIELD_MAPPING.school,
      schoolOther:
        process.env.FEISHU_FIELD_SCHOOL_OTHER ??
        DEFAULT_FEISHU_FIELD_MAPPING.schoolOther,
      quote:
        process.env.FEISHU_FIELD_QUOTE ?? DEFAULT_FEISHU_FIELD_MAPPING.quote,
      consent:
        process.env.FEISHU_FIELD_CONSENT ??
        DEFAULT_FEISHU_FIELD_MAPPING.consent,
      submittedAt:
        process.env.FEISHU_FIELD_SUBMITTED_AT ??
        DEFAULT_FEISHU_FIELD_MAPPING.submittedAt,
      images:
        process.env.FEISHU_FIELD_IMAGES ?? DEFAULT_FEISHU_FIELD_MAPPING.images,
    },
  };
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getTenantAccessToken(config: FeishuConfig) {
  const response = await fetch(
    `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: config.appId,
        app_secret: config.appSecret,
      }),
    },
  );
  const data = (await response.json()) as FeishuTokenResponse;

  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(data.msg ?? "Failed to get Feishu tenant access token.");
  }

  return data.tenant_access_token;
}

async function listBitableRecords(
  config: FeishuConfig,
  token: string,
  options: {
    cursorSubmittedAt?: Date | null;
    onPage?: (records: FeishuRecord[]) => void | Promise<void>;
  } = {},
) {
  const records: FeishuRecord[] = [];
  let pageToken: string | undefined;

  do {
    const request = buildBitableSearchRequest({
      cursorSubmittedAt: options.cursorSubmittedAt,
      fieldMapping: config.fieldMapping,
      pageSize: 500,
      pageToken,
      viewId: config.viewId,
    });
    const url = new URL(
      `${FEISHU_API_BASE}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/search`,
    );
    for (const [key, value] of Object.entries(request.query)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.body),
    });
    const data = (await response.json()) as FeishuListResponse<FeishuRecord>;

    if (data.code !== 0) {
      throw new Error(data.msg ?? "Failed to list Feishu Bitable records.");
    }

    const pageRecords = data.data?.items ?? [];
    records.push(...pageRecords);
    await options.onPage?.(pageRecords);
    pageToken = data.data?.has_more ? data.data.page_token : undefined;
  } while (pageToken);

  return records;
}

export function ensureUploadDirectory() {
  mkdirSync(join(process.cwd(), "public", "uploads", "feishu"), {
    recursive: true,
  });
}
