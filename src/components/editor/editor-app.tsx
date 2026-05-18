"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  ImageOff,
  Info,
  Inbox,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SubmissionCard } from "@/components/editor/submission-card";
import {
  DEFAULT_SUBMISSION_FILTER,
  FilterSheet,
} from "@/components/editor/filter-sheet";
import type { DashboardSnapshot } from "@/lib/data";
import { applySubmissionFilter, type SubmissionFilter } from "@/lib/selection-rules";
import {
  addCommentAction,
  addSubmissionImageAction,
  addSubmissionToIssueAction,
  batchAddFilteredSubmissionsToIssueAction,
  batchRemoveFilteredSubmissionsFromIssueAction,
  createIssueAction,
  deleteCommentAction,
  inspectDamagedFeishuImagesAction,
  logoutAction,
  moveIssueItemAction,
  moveSubmissionToIssueAction,
  removeSubmissionFromIssueAction,
  repairDamagedFeishuImagesAction,
  renameIssueAction,
  selectFinalCommentAction,
  setWorkingIssueAction,
  setSubmissionImageEnabledAction,
  setSubmissionIssueConfirmedAction,
  toggleCommentStarAction,
  toggleSubmissionStarAction,
  updateCommentAction,
  updateIssueItemSortOrderAction,
  updateUserProfileAction,
  updateSubmissionSchoolAction,
} from "@/app/app/actions";
import {
  IssueTitleLine,
  SetWorkingIssueChip,
} from "@/components/editor/issue-controls";
import { cn } from "@/lib/utils";
import type { ProfileInput } from "@/lib/auth-profile";

type Overlay = "none" | "profile" | "account" | "issue" | "filter" | "sync" | "about";
const PAGE_SIZE = 10;

type SyncReport = {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  complete: boolean;
  scanned: number;
  created: number;
  updated: number;
  skippedExisting: number;
  failed: number;
  images: {
    attempted: number;
    downloaded: number;
    existing: number;
    failed: number;
    skipped: number;
  };
  errors: string[];
};

type FeishuImageHealthSummary = {
  checked: number;
  damaged: number;
  failed: number;
  missingFiles: number;
  unsupported: number;
  repairable: number;
};

type ImageRepairReport = {
  before: FeishuImageHealthSummary;
  after: FeishuImageHealthSummary;
  repaired: number;
  images: {
    attempted: number;
    downloaded: number;
    existing: number;
    failed: number;
    skipped: number;
  };
};

type SyncProgress = {
  scanned: number;
  created: number;
  failed: number;
  fetched: number;
};

export function EditorApp({
  currentUser,
  snapshot,
}: {
  currentUser: { id: string; displayName: string; username: string };
  snapshot: DashboardSnapshot;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [tab, setTab] = useState<"library" | "issue">("library");
  const [libraryPage, setLibraryPage] = useState(1);
  const [issuePage, setIssuePage] = useState(1);
  const listRef = useRef<HTMLElement>(null);
  const [renameValue, setRenameValue] = useState(snapshot.issue?.title ?? "");
  const [issueError, setIssueError] = useState<string | null>(null);
  const [filter, setFilter] =
    useState<Required<SubmissionFilter>>(DEFAULT_SUBMISSION_FILTER);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [imageHealth, setImageHealth] = useState<FeishuImageHealthSummary | null>(
    null,
  );
  const [imageRepairReport, setImageRepairReport] =
    useState<ImageRepairReport | null>(null);
  const [imageRepairError, setImageRepairError] = useState<string | null>(null);
  const [checkingImages, setCheckingImages] = useState(false);
  const [repairingImages, setRepairingImages] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    scanned: 0,
    created: 0,
    failed: 0,
    fetched: 0,
  });
  const selectedIssue = snapshot.issue;
  const selectedIssueId = selectedIssue?.id ?? null;

  const issueItemsBySubmission = useMemo(() => {
    return new Map(
      (snapshot.issue?.items ?? []).map((item) => [item.submissionId, item]),
    );
  }, [snapshot.issue?.items]);

  const librarySubmissions = useMemo(
    () =>
      applySubmissionFilter(snapshot.submissions, filter, {
        currentUserId: currentUser.id,
      }),
    [currentUser.id, filter, snapshot.submissions],
  );

  const issueItems = useMemo(() => {
    if (!selectedIssue) {
      return [];
    }

    const normalized = selectedIssue.items.map((item) => ({
      ...item,
      submission: {
        ...item.submission,
        issueItems: [
          {
            id: item.id,
            issueId: selectedIssue.id,
            confirmed: item.confirmed,
            issue: { title: selectedIssue.title },
          },
        ],
      },
    }));

    return normalized.filter((item) =>
      applySubmissionFilter([item.submission], filter, {
        currentUserId: currentUser.id,
      }).length > 0,
    );
  }, [currentUser.id, filter, selectedIssue]);

  const isFiltered = Object.entries(filter).some(
    ([key, value]) =>
      value !== DEFAULT_SUBMISSION_FILTER[key as keyof typeof filter],
  );
  const currentListCount =
    tab === "library" ? librarySubmissions.length : issueItems.length;
  const activePage = tab === "library" ? libraryPage : issuePage;
  const pagedLibrarySubmissions = useMemo(
    () => paginateItems(librarySubmissions, libraryPage),
    [libraryPage, librarySubmissions],
  );
  const pagedIssueItems = useMemo(
    () => paginateItems(issueItems, issuePage),
    [issueItems, issuePage],
  );
  const issuePageStart = (issuePage - 1) * PAGE_SIZE;

  useEffect(() => {
    setRenameValue(snapshot.issue?.title ?? "");
  }, [snapshot.issue?.id, snapshot.issue?.title]);

  useEffect(() => {
    setLibraryPage(1);
    setIssuePage(1);
    scrollListToTop();
  }, [filter, snapshot.issue?.id]);

  useEffect(() => {
    setLibraryPage((page) => clampPage(page, librarySubmissions.length));
  }, [librarySubmissions.length]);

  useEffect(() => {
    setIssuePage((page) => clampPage(page, issueItems.length));
  }, [issueItems.length]);

  return (
    <main
      className="relative mx-auto flex max-w-md flex-col overflow-hidden bg-[#F4F4F6] text-foreground"
      style={{ height: "100dvh" }}
    >
      <TopBar
        currentUser={currentUser}
        onAvatarClick={() => setOverlay("profile")}
      />

      <div className="flex flex-shrink-0 border-b border-[#F0F0F0] bg-white">
        {[
          ["library", "投稿库"],
          ["issue", "刊数"],
        ].map(([value, label]) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value as "library" | "issue")}
              className="relative flex flex-1 items-center justify-center py-3"
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#FD80C2" : "#888",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </span>
              {active ? (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 24, height: 2.5, background: "#FD80C2" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "issue" ? (
        <div className="flex-shrink-0 border-b border-[#F0F0F0] bg-white">
          <button
            type="button"
            onClick={() => setOverlay("issue")}
            className="flex items-center gap-1.5 px-4 py-3 transition-colors active:bg-[#FFF0F8]"
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
              本刊
            </span>
            <ChevronDown size={15} style={{ color: "#FD80C2" }} />
          </button>
        </div>
      ) : null}

      {isFiltered ? (
        <div className="flex shrink-0 items-center justify-between border-b border-primary/15 bg-[#fff0f8] px-4 py-2">
          <span className="text-xs font-medium text-primary">
            已启用筛选 · 当前 {currentListCount} 条
          </span>
          <button
            type="button"
            onClick={() => setFilter(DEFAULT_SUBMISSION_FILTER)}
            className="text-xs text-primary"
          >
            清除
          </button>
        </div>
      ) : null}

      <PaginationBar
        count={currentListCount}
        page={activePage}
        onPageChange={(page) => {
          if (tab === "library") {
            setLibraryPage(page);
          } else {
            setIssuePage(page);
          }
          scrollListToTop();
        }}
      />

      <section
        ref={listRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 70 }}
      >
        <div className="px-3 pt-3">
        {tab === "library" ? (
          librarySubmissions.length > 0 ? (
            <Feed>
              {pagedLibrarySubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  currentUserId={currentUser.id}
                  issues={snapshot.issues}
                  workingIssueId={snapshot.workingIssueId}
                  submission={submission}
                  issueItem={issueItemsBySubmission.get(submission.id)}
                  mode="library"
                  onHeartSubmission={(submissionId) =>
                    run(() => toggleSubmissionStarAction(submissionId))
                  }
                  onConfirmSubmission={(submissionId, confirmed) =>
                    selectedIssueId
                      ? run(() =>
                          setSubmissionIssueConfirmedAction(
                            selectedIssueId,
                            submissionId,
                            confirmed,
                          ),
                        )
                      : undefined
                  }
                  onMove={(issueItemId, direction) =>
                    run(() => moveIssueItemAction(issueItemId, direction))
                  }
                  onMoveToPosition={(issueItemId, position) =>
                    run(() => updateIssueItemSortOrderAction(issueItemId, position))
                  }
                  onAddToIssue={(issueId, submissionId) =>
                    run(() => addSubmissionToIssueAction(issueId, submissionId))
                  }
                  onMoveToIssue={(submissionId, issueId) =>
                    run(() => moveSubmissionToIssueAction(submissionId, issueId))
                  }
                  onRemoveFromIssue={(submissionId) =>
                    run(() => removeSubmissionFromIssueAction(submissionId))
                  }
                  onUpdateSchool={(submissionId, school) =>
                    run(() => updateSubmissionSchoolAction(submissionId, school))
                  }
                  onToggleImageEnabled={(imageId, enabled) =>
                    run(() => setSubmissionImageEnabledAction(imageId, enabled))
                  }
                  onAddImage={(formData) => run(() => addSubmissionImageAction(formData))}
                  onAddComment={(submissionId, body) =>
                    addCommentAction(submissionId, body)
                  }
                  onHeartComment={(commentId) => toggleCommentStarAction(commentId)}
                  onSelectComment={(submissionId, commentId) =>
                    selectFinalCommentAction(submissionId, commentId)
                  }
                  onUpdateComment={(commentId, body) =>
                    updateCommentAction(commentId, body)
                  }
                  onDeleteComment={(commentId) => deleteCommentAction(commentId)}
                />
              ))}
            </Feed>
          ) : (
            <EmptyState title="投稿库为空" description="同步飞书后投稿将在这里显示" />
          )
        ) : issueItems.length > 0 ? (
          <Feed>
            {pagedIssueItems.map((item, index) => (
              <SubmissionCard
                key={item.id}
                currentUserId={currentUser.id}
                issues={snapshot.issues}
                workingIssueId={snapshot.workingIssueId}
                submission={item.submission}
                issueItem={item}
                mode="issue"
                isFirst={issuePageStart + index === 0}
                isLast={issuePageStart + index === issueItems.length - 1}
                onHeartSubmission={(submissionId) =>
                  run(() => toggleSubmissionStarAction(submissionId))
                }
                onConfirmSubmission={(submissionId, confirmed) =>
                  selectedIssueId
                    ? run(() =>
                        setSubmissionIssueConfirmedAction(
                          selectedIssueId,
                          submissionId,
                          confirmed,
                        ),
                      )
                    : undefined
                }
                onMove={(issueItemId, direction) =>
                  run(() => moveIssueItemAction(issueItemId, direction))
                }
                onMoveToPosition={(issueItemId, position) =>
                  run(() => updateIssueItemSortOrderAction(issueItemId, position))
                }
                onAddToIssue={(issueId, submissionId) =>
                  run(() => addSubmissionToIssueAction(issueId, submissionId))
                }
                onMoveToIssue={(submissionId, issueId) =>
                  run(() => moveSubmissionToIssueAction(submissionId, issueId))
                }
                onRemoveFromIssue={(submissionId) =>
                  run(() => removeSubmissionFromIssueAction(submissionId))
                }
                onUpdateSchool={(submissionId, school) =>
                  run(() => updateSubmissionSchoolAction(submissionId, school))
                }
                onToggleImageEnabled={(imageId, enabled) =>
                  run(() => setSubmissionImageEnabledAction(imageId, enabled))
                }
                onAddImage={(formData) => run(() => addSubmissionImageAction(formData))}
                onAddComment={(submissionId, body) =>
                  addCommentAction(submissionId, body)
                }
                onHeartComment={(commentId) => toggleCommentStarAction(commentId)}
                onSelectComment={(submissionId, commentId) =>
                  selectFinalCommentAction(submissionId, commentId)
                }
                onUpdateComment={(commentId, body) =>
                  updateCommentAction(commentId, body)
                }
                onDeleteComment={(commentId) => deleteCommentAction(commentId)}
              />
            ))}
          </Feed>
        ) : (
          <EmptyState title="当前刊数没有投稿" description="从投稿库中加入投稿" />
        )}
        </div>
      </section>

      <BottomBar
        onFilter={() => setOverlay("filter")}
        onPreview={() =>
          selectedIssueId ? router.push(`/app/preview?issue=${selectedIssueId}`) : null
        }
      />

      {overlay === "profile" ? (
        <ProfileMenu
          currentUser={currentUser}
          onClose={() => setOverlay("none")}
          onOpenAccount={() => setOverlay("account")}
          onOpenSync={() => setOverlay("sync")}
          onOpenAbout={() => setOverlay("about")}
        />
      ) : null}
      {overlay === "account" ? (
        <AccountDialog
          currentUser={currentUser}
          onClose={() => setOverlay("none")}
          onSaved={() => {
            setOverlay("none");
            router.refresh();
          }}
        />
      ) : null}
      {overlay === "issue" ? (
        <IssuePanel
          issues={snapshot.issues}
          currentIssueId={selectedIssueId}
          workingIssueId={snapshot.workingIssueId}
          renameValue={renameValue}
          error={issueError}
          onRenameValueChange={setRenameValue}
          onClose={() => {
            setIssueError(null);
            setOverlay("none");
          }}
          onRename={handleRenameIssue}
          onSelectIssue={(issueId) => {
            setOverlay("none");
            router.push(`/app?issue=${issueId}`);
          }}
          onSetWorkingIssue={(issueId) =>
            startTransition(async () => {
              await setWorkingIssueAction(issueId);
              router.push(`/app?issue=${issueId}`);
              setOverlay("none");
            })
          }
          onCreateIssue={handleCreateIssue}
        />
      ) : null}
      {overlay === "about" ? (
        <AboutDialog onClose={() => setOverlay("none")} />
      ) : null}
      {overlay === "filter" ? (
        <FilterSheet
          filter={filter}
          issues={snapshot.issues}
          workingIssueId={snapshot.workingIssueId}
          onApply={setFilter}
          onClose={() => setOverlay("none")}
          onBatchAdd={(issueId, draftFilter) => {
            startTransition(async () => {
              await batchAddFilteredSubmissionsToIssueAction(issueId, draftFilter);
            });
            setFilter(draftFilter);
            setOverlay("none");
          }}
          onBatchRemove={(draftFilter) => {
            startTransition(async () => {
              await batchRemoveFilteredSubmissionsFromIssueAction(draftFilter);
            });
            setFilter(draftFilter);
            setOverlay("none");
          }}
        />
      ) : null}
      {overlay === "sync" ? (
        <FeishuMaintenanceDialog
          lastSyncedAt={snapshot.lastSync?.finishedAt ?? null}
          syncing={syncing}
          error={syncError}
          progress={syncProgress}
          report={syncReport}
          imageHealth={imageHealth}
          imageRepairReport={imageRepairReport}
          imageRepairError={imageRepairError}
          checkingImages={checkingImages}
          repairingImages={repairingImages}
          onClose={() => setOverlay("none")}
          onSync={runStreamingSync}
          onCheckImages={runImageHealthCheck}
          onRepairImages={runImageRepair}
        />
      ) : null}
    </main>
  );

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  function scrollListToTop() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function handleRenameIssue() {
    if (!selectedIssueId) {
      return;
    }

    setIssueError(null);
    startTransition(async () => {
      try {
        await renameIssueAction(selectedIssueId, renameValue);
        setOverlay("none");
        router.refresh();
      } catch (error) {
        setIssueError(error instanceof Error ? error.message : "重命名失败");
      }
    });
  }

  function handleCreateIssue() {
    setIssueError(null);
    startTransition(async () => {
      const issueId = await createIssueAction();
      setOverlay("none");
      router.push(`/app?issue=${issueId}`);
    });
  }

  async function runStreamingSync() {
    setSyncError(null);
    setSyncReport(null);
    setSyncProgress({ scanned: 0, created: 0, failed: 0, fetched: 0 });
    setSyncing(true);

    try {
      const response = await fetch("/api/feishu-sync", { method: "POST" });
      if (!response.ok || !response.body) {
        throw new Error(`同步请求失败：${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          handleSyncEvent(JSON.parse(line));
        }
      }

      if (buffer.trim()) {
        handleSyncEvent(JSON.parse(buffer));
      }
      router.refresh();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  }

  async function runImageHealthCheck() {
    setImageRepairError(null);
    setImageRepairReport(null);
    setCheckingImages(true);
    try {
      setImageHealth(await inspectDamagedFeishuImagesAction());
    } catch (error) {
      setImageRepairError(error instanceof Error ? error.message : "检测失败");
    } finally {
      setCheckingImages(false);
    }
  }

  async function runImageRepair() {
    setImageRepairError(null);
    setRepairingImages(true);
    try {
      const report = await repairDamagedFeishuImagesAction();
      setImageRepairReport(report);
      setImageHealth(report.after);
      router.refresh();
    } catch (error) {
      setImageRepairError(error instanceof Error ? error.message : "修复失败");
    } finally {
      setRepairingImages(false);
    }
  }

  function handleSyncEvent(event: {
    type: string;
    fetched?: number;
    scanned?: number;
    created?: number;
    failed?: number;
    report?: SyncReport;
    message?: string;
  }) {
    if (event.type === "page") {
      setSyncProgress((current) => ({
        ...current,
        fetched: event.fetched ?? current.fetched,
        scanned: event.scanned ?? current.scanned,
      }));
    }
    if (event.type === "record") {
      setSyncProgress((current) => ({
        ...current,
        scanned: event.scanned ?? current.scanned,
        created: event.created ?? current.created,
        failed: event.failed ?? current.failed,
      }));
    }
    if (event.type === "report" && event.report) {
      setSyncReport(event.report);
    }
    if (event.type === "error") {
      setSyncError(event.message ?? "同步失败");
    }
  }
}

function Feed({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function paginateItems<T>(items: T[], page: number) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function clampPage(page: number, count: number) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return Math.min(Math.max(page, 1), totalPages);
}

function PaginationBar({
  count,
  page,
  onPageChange,
}: {
  count: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = clampPage(page, count);
  const start = count === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(count, safePage * PAGE_SIZE);

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F0F0F0] bg-white px-3 py-2">
      <div className="min-w-0 flex-1 text-left text-xs font-medium text-[#777]">
        {start}-{end} / {count}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="grid size-7 place-items-center rounded-lg bg-[#F5F5F5] text-[#555] disabled:opacity-35"
          aria-label="上一页"
        >
          <ChevronRight className="size-3.5 rotate-180" />
        </button>
        <span className="w-10 text-center text-xs font-semibold text-[#555]">
          {safePage}/{totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="grid size-7 place-items-center rounded-lg bg-[#F5F5F5] text-[#555] disabled:opacity-35"
          aria-label="下一页"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function TopBar({
  currentUser,
  onAvatarClick,
}: {
  currentUser: { displayName: string };
  onAvatarClick: () => void;
}) {
  const initials = currentUser.displayName.slice(0, 1);

  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#F0F0F0] bg-white px-4">
      <span
        style={{
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: 0,
          color: "#111",
        }}
      >
        全元光滑 · 迷惑行为
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAvatarClick}
          className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold leading-none text-white transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg, #FD80C2 0%, #F06292 100%)" }}
          aria-label="个人设置"
        >
          {initials}
        </button>
      </div>
    </div>
  );
}

function BottomBar({
  onFilter,
  onPreview,
}: {
  onFilter: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-around border-t border-[#F0F0F0] bg-white"
      style={{ height: 60, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <button
        type="button"
        onClick={onFilter}
        className="flex flex-col items-center gap-0.5 rounded-xl px-8 py-2 transition-colors active:bg-[#F5F5F5]"
      >
        <SlidersHorizontal size={18} className="text-[#555]" />
        <span style={{ fontSize: 11, color: "#555", fontWeight: 500 }}>
          筛选
        </span>
      </button>
      <div className="h-6 w-px bg-[#EBEBEB]" />
      <button
        type="button"
        onClick={onPreview}
        className="flex flex-col items-center gap-0.5 rounded-xl px-8 py-2 transition-colors active:bg-[#FFF0F8]"
      >
        <Eye size={18} style={{ color: "#FD80C2" }} />
        <span style={{ fontSize: 11, color: "#FD80C2", fontWeight: 500 }}>
          预览
        </span>
      </button>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-[#fff0f8] text-primary/70">
        <Inbox className="size-7" />
      </div>
      <p className="text-[15px] font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/65">{description}</p>
    </div>
  );
}

function ProfileMenu({
  currentUser,
  onClose,
  onOpenAccount,
  onOpenSync,
  onOpenAbout,
}: {
  currentUser: { displayName: string; username: string };
  onClose: () => void;
  onOpenAccount: () => void;
  onOpenSync: () => void;
  onOpenAbout: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative z-10 m-4 mt-14 overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-gradient-to-br from-[#FFF0F8] to-[#FFF] px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-14 flex-shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #FD80C2 0%, #F06292 100%)" }}
            >
              {currentUser.displayName.slice(0, 1)}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>
                {currentUser.displayName}
              </p>
              <p style={{ fontSize: 12, color: "#999" }}>
                用户名：{currentUser.username}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#F0F0F0]" />

        <button
          type="button"
          onClick={onOpenAccount}
          className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F5F5F5]"
        >
          <div className="flex items-center gap-3">
            <User size={16} className="text-[#888]" />
            <span style={{ fontSize: 14, color: "#222" }}>账户管理</span>
          </div>
          <div className="flex items-center gap-1">
            <ChevronRight size={14} className="text-[#CCC]" />
          </div>
        </button>

        <div className="mx-4 h-px bg-[#F0F0F0]" />

        <button
          type="button"
          onClick={onOpenSync}
          className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F5F5F5]"
        >
          <div className="flex items-center gap-3">
            <RefreshCw size={16} className="text-[#888]" />
            <span style={{ fontSize: 14, color: "#222" }}>拉取飞书</span>
          </div>
          <ChevronRight size={14} className="text-[#CCC]" />
        </button>

        <div className="mx-4 h-px bg-[#F0F0F0]" />

        <button
          type="button"
          onClick={onOpenAbout}
          className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F5F5F5]"
        >
          <div className="flex items-center gap-3">
            <Info size={16} className="text-[#888]" />
            <span style={{ fontSize: 14, color: "#222" }}>关于编辑台</span>
          </div>
          <ChevronRight size={14} className="text-[#CCC]" />
        </button>

        <div className="mx-4 h-px bg-[#F0F0F0]" />

        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F5F5F5]"
        >
          <div className="flex items-center gap-3">
            <MoreHorizontal size={16} className="text-[#888]" />
            <span style={{ fontSize: 14, color: "#222" }}>
              点击右上角 ···，存为浮窗
            </span>
          </div>
        </button>

        <div className="mx-4 h-px bg-[#F0F0F0]" />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors active:bg-[#FFF0F8]"
          >
            <LogOut size={16} style={{ color: "#FD80C2" }} />
            <span style={{ fontSize: 14, color: "#FD80C2" }}>退出登录</span>
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="relative z-10 mx-auto mt-3 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform active:scale-95"
      >
        <X size={18} className="text-[#555]" />
      </button>
    </div>
  );
}

function AccountDialog({
  currentUser,
  onClose,
  onSaved,
}: {
  currentUser: { username: string; displayName: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProfileInput>({
    username: currentUser.username,
    displayName: currentUser.displayName,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="关闭账户管理"
        onClick={onClose}
      />
      <section className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#FD80C2]">ACCOUNT</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111]">账户管理</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-[#F5F5F5]"
            aria-label="关闭账户管理"
          >
            <X size={14} className="text-[#666]" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            startTransition(async () => {
              const result = await updateUserProfileAction(form);
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              onSaved();
            });
          }}
        >
          <AccountField
            label="用户名"
            value={form.username}
            onChange={(value) => update("username", value)}
          />
          <AccountField
            label="显示名称"
            value={form.displayName}
            onChange={(value) => update("displayName", value)}
          />

          <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-3">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="size-4 text-[#999]" />
              <span className="text-sm font-semibold text-[#333]">修改密码</span>
            </div>
            <div className="space-y-2">
              <AccountField
                label="当前密码"
                type="password"
                value={form.currentPassword}
                onChange={(value) => update("currentPassword", value)}
              />
              <AccountField
                label="新密码"
                type="password"
                value={form.newPassword}
                onChange={(value) => update("newPassword", value)}
              />
              <AccountField
                label="确认新密码"
                type="password"
                value={form.confirmPassword}
                onChange={(value) => update("confirmPassword", value)}
              />
            </div>
          </div>

          {message ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "保存中..." : "保存账户资料"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AccountField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#777]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-[#E8E8E8] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#FD80C2]"
      />
    </label>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="关闭关于编辑台"
        onClick={onClose}
      />
      <section className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#FD80C2]">CHANGELOG</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111]">更新历史</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-full bg-[#F5F5F5]"
            aria-label="关闭关于编辑台"
          >
            <X size={14} className="text-[#666]" />
          </button>
        </div>
        <div className="h-px bg-[#F0F0F0]" />
        <div className="py-4">
          <p className="text-base font-semibold leading-6 text-[#111]">
            全元光滑 · 迷惑行为编辑台
          </p>
          <p className="mt-2 text-sm leading-6 text-[#555]">
            用于同步投稿、整理刊数、筛选采用内容并预览公众号文章。
          </p>
        </div>
        <div className="h-px bg-[#F0F0F0]" />
        <div className="space-y-4 py-4">
          <div className="rounded-xl bg-[#FFF8FC] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#111]">版本 1.1</p>
              <p className="text-xs font-medium text-[#999]">2026-05-18</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#555]">
              新增分页、个人工作中刊数、点赞筛选、账户管理和吐槽排序；优化刊数加入控件、图片预览关闭方式和大库加载流畅度。
            </p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#111]">版本 1.0</p>
              <p className="text-xs font-medium text-[#999]">2026-05-13</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#555]">
              正式发布：完善刊数命名与排序、批量归属操作、注册口令、账号菜单和发布前检查。
            </p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#111]">版本 0.9</p>
              <p className="text-xs font-medium text-[#999]">2026-05-13</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#555]">
              发布候选：完成编辑台核心体验、飞书同步、投稿筛选、采用预览和图片处理流程。
            </p>
          </div>
        </div>
        <div className="h-px bg-[#F0F0F0]" />
        <p className="mt-4 text-xs font-medium text-[#999]">
          Credit by Vicky 2026
        </p>
      </section>
    </div>
  );
}

function IssuePanel({
  issues,
  currentIssueId,
  workingIssueId,
  renameValue,
  error,
  onRenameValueChange,
  onClose,
  onRename,
  onSelectIssue,
  onSetWorkingIssue,
  onCreateIssue,
}: {
  issues: { id: string; title: string }[];
  currentIssueId: string | null;
  workingIssueId: string | null;
  renameValue: string;
  error: string | null;
  onRenameValueChange: (value: string) => void;
  onClose: () => void;
  onRename: () => void;
  onSelectIssue: (issueId: string) => void;
  onSetWorkingIssue: (issueId: string) => void;
  onCreateIssue: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        aria-label="关闭刊数面板"
        onClick={onClose}
      />
      <section className="relative z-10 flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-[#DDD]" />
        </div>
        <header className="flex flex-shrink-0 items-center justify-between px-4 py-3">
          <span style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>
            刊数管理
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full hover:bg-[#F5F5F5]"
            aria-label="关闭刊数面板"
          >
            <X size={16} className="text-[#888]" />
          </button>
        </header>

        <div className="h-px flex-shrink-0 bg-[#F0F0F0]" />

        <div className="flex-shrink-0 px-4 py-3">
          <p
            style={{
              fontSize: 11,
              color: "#AAA",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            当前刊数
          </p>
          {currentIssueId && renamingId === currentIssueId ? (
            <>
              <div className="flex gap-2">
                <input
                  value={renameValue}
                  onChange={(event) => onRenameValueChange(event.target.value)}
                  className="flex-1 rounded-lg border border-[#FECDE8] bg-[#FFF8FC] px-3 py-2 text-sm outline-none focus:border-[#FD80C2]"
                  style={{ fontSize: 14, color: "#111" }}
                  autoFocus
                  onKeyDown={(event) => event.key === "Enter" && onRename()}
                />
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-[#999]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onRename}
                  className="rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: "#FD80C2", fontWeight: 500 }}
                >
                  保存
                </button>
              </div>
              {error ? (
                <p className="mt-2 text-xs font-medium text-red-500">{error}</p>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 15, color: "#111", fontWeight: 500 }}>
                {issues.find((issue) => issue.id === currentIssueId)?.title}
              </span>
              {currentIssueId ? (
                <button
                  type="button"
                  onClick={() => {
                    const currentTitle =
                      issues.find((issue) => issue.id === currentIssueId)?.title ?? "";
                    onRenameValueChange(currentTitle);
                    setRenamingId(currentIssueId);
                  }}
                  className="flex items-center gap-1 rounded-md bg-[#F5F5F5] px-2 py-1 transition-colors active:bg-[#EBEBEB]"
                >
                  <Pencil size={11} className="text-[#999]" />
                  <span style={{ fontSize: 11, color: "#888" }}>重命名</span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="h-px flex-shrink-0 bg-[#F0F0F0]" />

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <p
              style={{
                fontSize: 11,
                color: "#AAA",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}
            >
              所有刊数
            </p>
          </div>
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between gap-2 px-4 py-3.5 transition-colors active:bg-[#FFF0F8]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectIssue(issue.id)}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <div
                    className="size-2 flex-shrink-0 rounded-full"
                    style={{
                      background: issue.id === currentIssueId ? "#FD80C2" : "#DDD",
                    }}
                  />
                  <span
                    className={cn(
                      "min-w-0 text-sm",
                      issue.id === currentIssueId ? "font-semibold" : "font-normal",
                    )}
                  >
                    <IssueTitleLine
                      title={issue.title}
                      isWorking={issue.id === workingIssueId}
                      active={issue.id === currentIssueId}
                    />
                  </span>
                </button>
                {issue.id !== workingIssueId ? (
                  <SetWorkingIssueChip onClick={() => onSetWorkingIssue(issue.id)} />
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {issue.id === currentIssueId ? (
                  <Check size={15} style={{ color: "#FD80C2" }} />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="h-px flex-shrink-0 bg-[#F0F0F0]" />

        <button
          type="button"
          onClick={onCreateIssue}
          className="mx-4 my-3 flex items-center gap-2 rounded-xl px-4 py-3 transition-colors active:opacity-85"
          style={{ background: "linear-gradient(135deg, #FFF8FC 0%, #F7F7FA 100%)" }}
        >
          <Plus size={16} style={{ color: "#FD80C2" }} />
          <span style={{ fontSize: 14, color: "#FD80C2", fontWeight: 500 }}>
            新建刊数
          </span>
        </button>
      </section>
    </div>
  );
}

function FeishuMaintenanceDialog({
  lastSyncedAt,
  syncing,
  error,
  progress,
  report,
  imageHealth,
  imageRepairReport,
  imageRepairError,
  checkingImages,
  repairingImages,
  onClose,
  onSync,
  onCheckImages,
  onRepairImages,
}: {
  lastSyncedAt: Date | string | null;
  syncing: boolean;
  error: string | null;
  progress: SyncProgress;
  report: SyncReport | null;
  imageHealth: FeishuImageHealthSummary | null;
  imageRepairReport: ImageRepairReport | null;
  imageRepairError: string | null;
  checkingImages: boolean;
  repairingImages: boolean;
  onClose: () => void;
  onSync: () => void;
  onCheckImages: () => void;
  onRepairImages: () => void;
}) {
  const lastSyncText = lastSyncedAt
    ? new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(lastSyncedAt))
    : "从未同步";
  const busy = syncing || checkingImages || repairingImages;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-center justify-center px-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="关闭拉取飞书"
        onClick={onClose}
      />
      <section className="relative z-10 max-h-[86vh] w-full max-w-96 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFF0F8]">
            <RefreshCw size={18} style={{ color: "#FD80C2" }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
              拉取飞书
            </p>
            <p style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
              上次更新：{lastSyncText}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[#C2410C]">
              非必要不要更新，以免浪费飞书 API 额度。
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <section className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFB] px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <RefreshCw
                size={15}
                className={cn("text-[#FD80C2]", syncing && "animate-spin")}
              />
              <p className="text-sm font-semibold text-[#111]">更新内容</p>
            </div>
            <p className="mb-3 text-xs leading-5 text-[#666]">
              按飞书投稿日期增量拉取新投稿，不覆盖已导入后的编辑内容。
            </p>
            {syncing ? (
              <div className="mb-3">
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#F1F1F3]">
                  <div
                    className="h-full rounded-full bg-[#FD80C2] transition-all"
                    style={{
                      width: `${Math.min(
                        96,
                        Math.max(
                          12,
                          progress.scanned === 0 ? 12 : 42 + progress.created,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#777]">
                  已扫描 {progress.scanned} 条，新增 {progress.created} 条，失败{" "}
                  {progress.failed} 条
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="mb-3 rounded-lg bg-[#FFF3F3] px-3 py-2 text-xs text-[#DC2626]">
                {error}
              </p>
            ) : null}
            {report ? (
              <SyncReportSummary report={report} />
            ) : null}
            <button
              type="button"
              className="w-full rounded-xl py-2.5 text-white transition-opacity active:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #FD80C2 0%, #F06292 100%)",
                fontSize: 14,
                fontWeight: 600,
              }}
              disabled={busy}
              onClick={onSync}
            >
              {syncing ? "拉取中..." : report ? "再次拉取新增内容" : "拉取新增内容"}
            </button>
          </section>

          <section className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFB] px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <ImageOff size={15} className="text-[#FD80C2]" />
              <p className="text-sm font-semibold text-[#111]">
                检测损坏图片，重新修复
              </p>
            </div>
            <p className="mb-3 text-xs leading-5 text-[#666]">
              只检查飞书来源图片，不处理编辑手动上传的图片。
            </p>

            {imageHealth ? <ImageHealthSummary summary={imageHealth} /> : null}

            {imageRepairReport ? (
              <p className="mb-3 rounded-lg bg-[#F0FDF4] px-3 py-2 text-xs leading-5 text-[#15803D]">
                已修复 {imageRepairReport.repaired} 张，剩余损坏{" "}
                {imageRepairReport.after.damaged} 张。
              </p>
            ) : null}

            {imageRepairError ? (
              <p className="mb-3 rounded-lg bg-[#FFF3F3] px-3 py-2 text-xs leading-5 text-[#DC2626]">
                {imageRepairError}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-[#555] transition-colors active:bg-[#F0F0F0] disabled:opacity-50"
                disabled={busy}
                onClick={onCheckImages}
              >
                <Search size={14} />
                {checkingImages ? "检测中..." : "检测损坏图片"}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-90 disabled:opacity-50"
                style={{ background: "#FD80C2" }}
                disabled={busy || !imageHealth || imageHealth.repairable === 0}
                onClick={onRepairImages}
              >
                {repairingImages ? "修复中..." : "重新修复"}
              </button>
            </div>
          </section>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-[#F5F5F5] py-2.5 transition-colors active:bg-[#EBEBEB]"
          style={{ fontSize: 14, color: "#666", fontWeight: 500 }}
          onClick={onClose}
        >
          关闭
        </button>
      </section>
    </div>
  );
}

function SyncReportSummary({ report }: { report: SyncReport }) {
  return (
    <div
      className="mb-3 rounded-xl px-3 py-3"
      style={{ background: report.complete ? "#F0FDF4" : "#FFF7ED" }}
    >
      <p
        className="mb-2 text-xs font-semibold"
        style={{ color: report.complete ? "#15803D" : "#C2410C" }}
      >
        {report.complete ? "同步完整" : "同步未完整"}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#555]">
        <span>扫描 {report.scanned}</span>
        <span>新增 {report.created}</span>
        <span>跳过旧内容 {report.skippedExisting}</span>
        <span>记录失败 {report.failed}</span>
        <span>图片完成 {report.images.downloaded + report.images.existing}</span>
        <span>图片异常 {report.images.failed + report.images.skipped}</span>
      </div>
      {report.errors.length ? (
        <div className="mt-3 max-h-28 overflow-y-auto rounded-lg bg-white/70 px-2 py-2">
          {report.errors.slice(0, 8).map((item) => (
            <p key={item} className="mb-1 text-[11px] leading-4 text-[#9A3412]">
              {item}
            </p>
          ))}
          {report.errors.length > 8 ? (
            <p className="text-[11px] text-[#9A3412]">
              还有 {report.errors.length - 8} 条异常，已记录在同步日志。
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ImageHealthSummary({ summary }: { summary: FeishuImageHealthSummary }) {
  return (
    <div className="mb-3 rounded-xl bg-white px-3 py-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#555]">
        <span>已检查 {summary.checked}</span>
        <span>损坏 {summary.damaged}</span>
        <span>文件缺失 {summary.missingFiles}</span>
        <span>处理失败 {summary.failed}</span>
        <span>不支持 {summary.unsupported}</span>
        <span>可修复 {summary.repairable}</span>
      </div>
    </div>
  );
}
