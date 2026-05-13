import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = join(process.cwd(), "prisma", "dev.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Submission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "feishuRecordId" TEXT UNIQUE,
  "serialNumber" TEXT,
  "school" TEXT NOT NULL,
  "submitterQuote" TEXT NOT NULL,
  "consentGranted" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SubmissionImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "remoteUrl" TEXT,
  "localPath" TEXT NOT NULL,
  "originalPath" TEXT,
  "assetKind" TEXT NOT NULL DEFAULT 'IMAGE',
  "width" INTEGER,
  "height" INTEGER,
  "bytes" INTEGER,
  "originalBytes" INTEGER,
  "processedBytes" INTEGER,
  "originalFormat" TEXT,
  "processedFormat" TEXT,
  "mimeType" TEXT,
  "processingStatus" TEXT NOT NULL DEFAULT 'READY',
  "processingError" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionImage_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Issue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "IssueItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issueId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "sortOrder" REAL NOT NULL,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "IssueItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IssueItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IssueItem_issueId_submissionId_key" ON "IssueItem"("issueId", "submissionId");

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'EDITOR',
  "selected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Reaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "submissionId" TEXT,
  "commentId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reaction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_userId_kind_targetType_submissionId_commentId_key" ON "Reaction"("userId", "kind", "targetType", "submissionId", "commentId");

CREATE TABLE IF NOT EXISTS "Selection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "submissionId" TEXT,
  "commentId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Selection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Selection_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Selection_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Selection_userId_targetType_submissionId_commentId_key" ON "Selection"("userId", "targetType", "submissionId", "commentId");

CREATE TABLE IF NOT EXISTS "SyncJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  "created" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "scanned" INTEGER NOT NULL DEFAULT 0,
  "imageAttempted" INTEGER NOT NULL DEFAULT 0,
  "imageDownloaded" INTEGER NOT NULL DEFAULT 0,
  "imageExisting" INTEGER NOT NULL DEFAULT 0,
  "imageFailed" INTEGER NOT NULL DEFAULT 0,
  "imageSkipped" INTEGER NOT NULL DEFAULT 0,
  "cursorSubmittedAt" DATETIME,
  "cursorSerialNumber" TEXT,
  "cursorRecordId" TEXT,
  "complete" BOOLEAN NOT NULL DEFAULT false,
  "details" TEXT,
  "error" TEXT
);
`);

const imageColumns = db
  .prepare(`PRAGMA table_info("SubmissionImage")`)
  .all()
  .map((column) => column.name);

if (!imageColumns.includes("enabled")) {
  db.exec(`ALTER TABLE "SubmissionImage" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;`);
}

if (!imageColumns.includes("updatedAt")) {
  db.exec(`ALTER TABLE "SubmissionImage" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';`);
}

for (const [name, definition] of [
  ["originalPath", `"originalPath" TEXT`],
  ["assetKind", `"assetKind" TEXT NOT NULL DEFAULT 'IMAGE'`],
  ["originalBytes", `"originalBytes" INTEGER`],
  ["processedBytes", `"processedBytes" INTEGER`],
  ["originalFormat", `"originalFormat" TEXT`],
  ["processedFormat", `"processedFormat" TEXT`],
  ["mimeType", `"mimeType" TEXT`],
  ["processingStatus", `"processingStatus" TEXT NOT NULL DEFAULT 'READY'`],
  ["processingError", `"processingError" TEXT`],
]) {
  if (!imageColumns.includes(name)) {
    db.exec(`ALTER TABLE "SubmissionImage" ADD COLUMN ${definition};`);
  }
}

const syncJobColumns = db
  .prepare(`PRAGMA table_info("SyncJob")`)
  .all()
  .map((column) => column.name);

for (const [name, definition] of [
  ["skipped", `"skipped" INTEGER NOT NULL DEFAULT 0`],
  ["scanned", `"scanned" INTEGER NOT NULL DEFAULT 0`],
  ["imageAttempted", `"imageAttempted" INTEGER NOT NULL DEFAULT 0`],
  ["imageDownloaded", `"imageDownloaded" INTEGER NOT NULL DEFAULT 0`],
  ["imageExisting", `"imageExisting" INTEGER NOT NULL DEFAULT 0`],
  ["imageFailed", `"imageFailed" INTEGER NOT NULL DEFAULT 0`],
  ["imageSkipped", `"imageSkipped" INTEGER NOT NULL DEFAULT 0`],
  ["cursorSubmittedAt", `"cursorSubmittedAt" DATETIME`],
  ["cursorSerialNumber", `"cursorSerialNumber" TEXT`],
  ["cursorRecordId", `"cursorRecordId" TEXT`],
  ["complete", `"complete" BOOLEAN NOT NULL DEFAULT false`],
  ["details", `"details" TEXT`],
]) {
  if (!syncJobColumns.includes(name)) {
    db.exec(`ALTER TABLE "SyncJob" ADD COLUMN ${definition};`);
  }
}

db.close();
console.log(`SQLite schema ready at ${dbPath}`);
