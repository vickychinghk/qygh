# Mihuo Editor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable mobile-first editorial backend for managing “迷惑行为” submissions, comments, reactions, confirmation, sorting, and basic HTML export.

**Architecture:** Use a Next.js App Router application with server actions and route handlers for business operations. Store local MVP data in SQLite through Prisma, with model boundaries that can later switch to PostgreSQL and real Feishu sync. Keep UI components small: app shell, submission list, submission card, comment list, issue toolbar, and export panel.

**Tech Stack:** Next.js, React, TypeScript, Prisma, SQLite, Tailwind CSS, shadcn/ui, lucide-react, bcryptjs, jose, sharp, Vitest.

---

## File Structure

- `package.json`: scripts and dependencies.
- `src/app/layout.tsx`: root HTML and global app metadata.
- `src/app/page.tsx`: redirect entry.
- `src/app/login/page.tsx`: login screen.
- `src/app/app/page.tsx`: main mobile editor page.
- `src/app/api/export/[issueId]/route.ts`: HTML export endpoint.
- `src/app/globals.css`: Tailwind and app design tokens.
- `src/components/editor/editor-app.tsx`: client-side shell and interaction coordinator.
- `src/components/editor/submission-card.tsx`: submission row/card UI.
- `src/components/editor/comment-thread.tsx`: comment suggestions and final-selection UI.
- `src/components/editor/export-panel.tsx`: basic HTML preview/export UI.
- `src/components/editor/user-avatar.tsx`: initial-based avatar.
- `src/components/ui/*`: shadcn UI primitives.
- `src/lib/auth.ts`: password/session helpers.
- `src/lib/data.ts`: Prisma data access and mutations.
- `src/lib/export-html.ts`: deterministic export HTML generation.
- `src/lib/mock.ts`: seed data constants.
- `src/lib/utils.ts`: `cn` helper.
- `prisma/schema.prisma`: database schema.
- `prisma/seed.ts`: local seed users, issue, submissions, comments.
- `tests/export-html.test.ts`: export rules.
- `tests/selection-rules.test.ts`: one-final-comment rule and reaction behavior.

## Task 1: Scaffold App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `components.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/utils.ts`

- [ ] Install Next.js, React, Prisma, shadcn dependencies, lucide, auth helpers, sharp, Vitest.
- [ ] Initialize Tailwind and shadcn-compatible file structure.
- [ ] Add scripts: `dev`, `build`, `lint`, `test`, `db:push`, `db:seed`.
- [ ] Verify `npm run build` reaches dependency setup or a clear missing-code error.

## Task 2: Data Model And Seeds

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/mock.ts`
- Create: `src/lib/data.ts`

- [ ] Define Prisma models for User, Submission, SubmissionImage, Issue, IssueItem, Comment, Reaction, Selection, SyncJob.
- [ ] Add seed users with password `123456`, initials, and display names.
- [ ] Add one issue and several seed submissions with image placeholders.
- [ ] Implement data access functions for dashboard snapshot, reactions, confirmations, comments, and ordering.
- [ ] Run `npm run db:push` and `npm run db:seed`.

## Task 3: TDD For Business Rules

**Files:**
- Create: `tests/export-html.test.ts`
- Create: `tests/selection-rules.test.ts`
- Modify: `src/lib/export-html.ts`
- Modify: `src/lib/data.ts`

- [ ] Write failing test: export includes only confirmed issue items.
- [ ] Write failing test: export uses the single selected final comment.
- [ ] Write failing test: selecting a comment clears prior selected comments for that submission.
- [ ] Run tests and verify they fail for missing implementations.
- [ ] Implement minimal export and selection functions.
- [ ] Run tests and verify they pass.

## Task 4: Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/page.tsx`
- Modify: `src/app/app/page.tsx`

- [ ] Implement password hash verification and JWT session cookie.
- [ ] Add login page with mobile-first form.
- [ ] Redirect unauthenticated users to `/login`.
- [ ] Redirect `/` to `/app` when logged in or `/login` otherwise.
- [ ] Verify login works with seeded users.

## Task 5: Mobile Editor UI

**Files:**
- Create: `src/components/editor/editor-app.tsx`
- Create: `src/components/editor/submission-card.tsx`
- Create: `src/components/editor/comment-thread.tsx`
- Create: `src/components/editor/user-avatar.tsx`
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] Build tabbed mobile shell: 投稿库 / 本期 / 导出.
- [ ] Render compact submission cards with thumbnails, school, time, quote, star, check, editor avatars.
- [ ] Render expanded comment thread with star and single final check.
- [ ] Add bottom action bar for filter, add/confirm, reorder, export.
- [ ] Keep all actions functional through server actions or route handlers.

## Task 6: Issue Sorting And Export

**Files:**
- Create: `src/components/editor/export-panel.tsx`
- Create: `src/app/api/export/[issueId]/route.ts`
- Modify: `src/lib/export-html.ts`
- Modify: `src/lib/data.ts`
- Modify: `src/components/editor/editor-app.tsx`

- [ ] Implement move up/down for issue items.
- [ ] Implement basic HTML export route.
- [ ] Add export preview/copy panel.
- [ ] Verify exported HTML contains only confirmed submissions in sorted order.

## Task 7: Verification

**Files:**
- Modify as needed after QA.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start local dev server.
- [ ] Open app in browser at mobile viewport.
- [ ] Verify login, tabs, star, confirm, add comment, select final comment, reorder, export.
- [ ] Compare implementation to `docs/design/mobile-editor-concept.png` for palette, density, tab structure, icon treatment, mobile layout, and export path.

