import { ensureUploadDirectory, syncFeishuSubmissions } from "../src/lib/feishu-sync";

async function main() {
  ensureUploadDirectory();
  const result = await syncFeishuSubmissions();
  console.log(
    [
      `Feishu sync ${result.status}: ${result.created} created`,
      `${result.skippedExisting} skipped`,
      `${result.failed} failed`,
      `${result.scanned} scanned`,
      `images ${result.images.downloaded} downloaded/${result.images.failed} failed/${result.images.skipped} skipped`,
      `complete=${result.complete}`,
    ].join(", "),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
