import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { normalizeExistingPublicAsset } from "../src/lib/image-pipeline";
import { prisma } from "../src/lib/prisma";

type ReprocessArgs = {
  force: boolean;
  serialNumbers: string[];
};

const args = parseArgs(process.argv.slice(2));

async function main() {
  const images = await prisma.submissionImage.findMany({
    where: args.serialNumbers.length
      ? { submission: { serialNumber: { in: args.serialNumbers } } }
      : undefined,
    include: { submission: { select: { serialNumber: true } } },
    orderBy: [{ submission: { serialNumber: "asc" } }, { sortOrder: "asc" }],
  });

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const image of images) {
    if (
      !args.force &&
      image.processingStatus === "READY" &&
      image.localPath.startsWith("/uploads/processed/")
    ) {
      skipped += 1;
      continue;
    }

    const currentPath = image.originalPath ?? image.localPath;
    const absolutePath = join(process.cwd(), "public", currentPath);
    if (!existsSync(absolutePath)) {
      failed += 1;
      await prisma.submissionImage.update({
        where: { id: image.id },
        data: {
          assetKind: "UNSUPPORTED",
          processingStatus: "FAILED",
          processingError: `Missing source file: ${currentPath}`,
        },
      });
      continue;
    }

    try {
      const token = inferStableToken(currentPath, image.id);
      const asset = await normalizeExistingPublicAsset({
        currentPath,
        fileName: fileNameWithoutTokenPrefix(currentPath, token),
        remoteMimeType: image.mimeType,
        source: sourceFromPath(currentPath),
        token,
      });

      await prisma.submissionImage.update({
        where: { id: image.id },
        data: {
          localPath: asset.localPath,
          originalPath: asset.originalPath,
          assetKind: asset.assetKind,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
          originalBytes: asset.originalBytes,
          processedBytes: asset.processedBytes,
          originalFormat: asset.originalFormat,
          processedFormat: asset.processedFormat,
          mimeType: asset.mimeType,
          processingStatus: asset.processingStatus,
          processingError: asset.processingError,
        },
      });
      if (asset.processingStatus === "READY" || asset.assetKind === "VIDEO") {
        processed += 1;
      } else {
        failed += 1;
      }
      console.log(
        `processed serial=${image.submission.serialNumber ?? "-"} image=${image.id} ${currentPath} -> ${asset.localPath}`,
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      await prisma.submissionImage.update({
        where: { id: image.id },
        data: {
          assetKind: "UNSUPPORTED",
          processingStatus: "FAILED",
          processingError: message,
        },
      });
      console.log(
        `failed serial=${image.submission.serialNumber ?? "-"} image=${image.id}: ${message}`,
      );
    }
  }

  console.log(
    `Image reprocess complete: ${processed} processed, ${skipped} skipped, ${failed} failed.`,
  );
}

function parseArgs(values: string[]): ReprocessArgs {
  const serialNumbers: string[] = [];
  let force = false;

  for (const value of values) {
    if (value === "--force") {
      force = true;
    } else if (value.startsWith("--serial=")) {
      serialNumbers.push(...value.slice("--serial=".length).split(",").filter(Boolean));
    }
  }

  return { force, serialNumbers };
}

function inferStableToken(path: string, fallback: string) {
  return basename(path).split("-")[0] || fallback;
}

function fileNameWithoutTokenPrefix(path: string, token: string) {
  let name = basename(path);
  const prefix = `${token}-`;
  while (name.startsWith(prefix)) {
    name = name.slice(prefix.length);
  }
  return name;
}

function sourceFromPath(path: string) {
  if (path.includes("/feishu/")) {
    return "feishu" as const;
  }
  if (path.includes("/manual/")) {
    return "manual" as const;
  }
  return "legacy" as const;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
