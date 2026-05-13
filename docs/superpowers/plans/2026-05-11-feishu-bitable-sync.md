# Feishu Bitable Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull submissions from a Feishu Bitable table into the local Prisma `Submission` and `SubmissionImage` tables.

**Architecture:** Add a small Feishu API client, a pure mapper from Feishu record fields to local submission inputs, and a CLI script for manual sync. Keep sync manual and idempotent by using `feishuRecordId` as the upsert key.

**Tech Stack:** TypeScript, Prisma, Node fetch, Vitest, existing SQLite development database.

---

## File Structure

- `src/lib/feishu-sync.ts`: env loading, Feishu client calls, field mapping, record normalization, Prisma upsert sync.
- `scripts/sync-feishu.ts`: local manual sync entrypoint.
- `tests/feishu-sync.test.ts`: mapper and config parsing tests.
- `.env.local`: ignored local Feishu credentials and table identifiers.

## Task 1: Mapper Tests

- [ ] Write failing tests for Bitable URL/config parsing.
- [ ] Write failing tests for text, date, checkbox, and attachment field normalization.
- [ ] Run the targeted Vitest file and confirm failures.

## Task 2: Sync Implementation

- [ ] Implement Feishu env loading without hardcoding secrets.
- [ ] Implement tenant token fetch.
- [ ] Implement Bitable record search with pagination.
- [ ] Implement field mapping defaults and env overrides.
- [ ] Implement `Submission` upsert and image replacement per record.

## Task 3: Manual Script And Verification

- [ ] Add `scripts/sync-feishu.ts`.
- [ ] Add an npm script for manual sync.
- [ ] Run unit tests.
- [ ] Run the sync script against the configured Feishu table.
- [ ] Inspect local database through the app or Prisma output.
