# Feishu Incremental Sync Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock-backed Feishu sync with a clean one-time import plus server-side incremental refresh flow that reports completeness and progress to the editor.

**Architecture:** Store sync cursor metadata in `SyncJob`, query Feishu Bitable with server-side sort and filter where possible, and only create records that do not exist locally. Keep old Feishu-origin local records immutable after import because the source table is treated as append-only. Provide a sync API route that streams progress events for the browser progress bar, while the existing server action remains available for CLI/simple sync use.

**Tech Stack:** Next.js App Router, React, Prisma SQLite, Feishu Bitable records search API, Vitest.

---

## File Structure

- Modify `prisma/schema.prisma`: add sync report fields such as scanned, skipped, image counts, cursor serial, cursor timestamp, cursor record ID, and a JSON details field.
- Modify `scripts/init-sqlite.mjs`: keep SQLite schema in sync with Prisma fields.
- Modify `prisma/seed.ts`: remove mock submissions/images/comments/reactions and seed only users plus one empty issue.
- Modify `src/lib/feishu-sync.ts`: split Feishu client helpers, create incremental filter/sort payloads, create-only import path, image report accounting, and clear-business-data helper.
- Modify `scripts/sync-feishu.ts`: print the richer report.
- Modify `src/app/app/actions.ts`: expose clear-data action if needed and keep simple sync action.
- Create `src/app/api/feishu-sync/route.ts`: run sync and stream progress/report events to the browser.
- Modify `src/lib/data.ts`: support empty dashboard snapshots with no issue items and include rich last sync.
- Modify `src/app/app/page.tsx`: stop redirecting to login when there is no issue.
- Modify `src/components/editor/editor-app.tsx`: show sync progress, report, partial/failure state, and empty app state.
- Modify `tests/feishu-sync.test.ts`: add tests for incremental request payloads, create-only behavior, and report accounting.

## Tasks

### Task 1: Sync Contract Tests

- [ ] Add tests in `tests/feishu-sync.test.ts` for building an initial search request without a filter, and an incremental request with `sort` plus a cursor filter using the configured submitted-at field.
- [ ] Add tests proving the sync importer skips existing `feishuRecordId` rows and only creates new submissions.
- [ ] Add tests proving image download success, failure, and skipped-limit counts are reflected in the returned report.
- [ ] Run `npm test -- tests/feishu-sync.test.ts` and confirm the new tests fail for missing behavior.

### Task 2: Schema And Data Cleanup

- [ ] Add SyncJob report/cursor columns to `prisma/schema.prisma`.
- [ ] Mirror the same columns and migration guards in `scripts/init-sqlite.mjs`.
- [ ] Remove mock submissions and mock images from `prisma/seed.ts`, keeping users and one empty issue.
- [ ] Add a cleanup helper that clears business tables in dependency order while preserving users.
- [ ] Run `npm run db:push`.

### Task 3: Incremental Feishu Sync

- [ ] Implement search request payload helpers that use Feishu Bitable `records/search` with `page_size`, `page_token`, `view_id`, `sort`, and `filter`.
- [ ] Implement `syncFeishuSubmissions` as create-only: existing Feishu records are counted as skipped, not updated.
- [ ] Store a cursor from the max submitted-at/serial/record id among successfully created or already-seen records.
- [ ] Record detailed success, partial, and failed reports in `SyncJob`.
- [ ] Update `scripts/sync-feishu.ts` output.
- [ ] Run `npm test -- tests/feishu-sync.test.ts`.

### Task 4: Browser Progress And Report UI

- [ ] Add `src/app/api/feishu-sync/route.ts` using newline-delimited JSON events for `start`, `page`, `record`, `report`, and `error`.
- [ ] Update `EditorApp` sync dialog to call the streaming route, show a progress bar, and show the final report without closing immediately.
- [ ] Update empty dashboard behavior so a cleaned database still opens the app and tells the user to sync.
- [ ] Run unit tests and build/type checks.

### Task 5: Clear Current Local Data And Verify

- [ ] Clear current local business content while preserving users.
- [ ] Confirm SQLite counts show zero submissions, images, comments, reactions, selections, issue items, and sync jobs.
- [ ] Run the test suite.
- [ ] Start the dev server and verify the app renders the empty state and sync dialog.

## Self-Review

- The plan covers all six identified issues: full refresh, destructive rewrites, image-limit opacity, missing progress/report UI, mock seed data, and empty app behavior.
- No placeholders are left; each task has concrete files and commands.
- Types and names are consistent with the current codebase and Prisma models.
