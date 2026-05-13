"use client";

import type React from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  Inbox,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
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
  createIssueAction,
  deleteCommentAction,
  logoutAction,
  moveIssueItemAction,
  moveSubmissionToIssueAction,
  removeSubmissionFromIssueAction,
  renameIssueAction,
  reorderIssueItemToPositionAction,
  selectFinalCommentAction,
  setSubmissionImageEnabledAction,
  setSubmissionIssueConfirmedAction,
  toggleCommentStarAction,
  toggleSubmissionStarAction,
  updateCommentAction,
  updateSubmissionSchoolAction,
} from "@/app/app/actions";
import { cn } from "@/lib/utils";

type Overlay = "none" | "profile" | "issue" | "filter" | "sync";

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
  const [renameValue, setRenameValue] = useState(snapshot.issue?.title ?? "");
  const [filter, setFilter] =
    useState<Required<SubmissionFilter>>(DEFAULT_SUBMISSION_FILTER);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
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
    () => applySubmissionFilter(snapshot.submissions, filter),
    [filter, snapshot.submissions],
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
      applySubmissionFilter([item.submission], filter).length > 0,
    );
  }, [filter, selectedIssue]);

  const isFiltered = Object.entries(filter).some(
    ([key, value]) =>
      value !== DEFAULT_SUBMISSION_FILTER[key as keyof typeof filter],
  );
  const currentListCount =
    tab === "library" ? librarySubmissions.length : issueItems.length;

  useEffect(() => {
    setRenameValue(snapshot.issue?.title ?? "");
  }, [snapshot.issue?.id, snapshot.issue?.title]);

  return (
    <main
      className="relative mx-auto flex max-w-md flex-col overflow-hidden bg-[#F4F4F6] text-foreground"
      style={{ height: "100dvh" }}
    >
      <TopBar
        currentUser={currentUser}
        syncing={syncing}
        onAvatarClick={() => setOverlay("profile")}
        onSync={() => setOverlay("sync")}
      />

      <div className="flex flex-shrink-0 border-b border-[#F0F0F0] bg-white">
        {[
          ["library", "投稿库"],
          ["issue", "期数"],
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
              {snapshot.issue?.title ?? "未选择期数"}
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

      <section className="flex-1 overflow-y-auto" style={{ paddingBottom: 70 }}>
        <div className="px-3 pt-3">
        {tab === "library" ? (
          librarySubmissions.length > 0 ? (
            <Feed>
              {librarySubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  currentUserId={currentUser.id}
                  issues={snapshot.issues}
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
                    run(() => reorderIssueItemToPositionAction(issueItemId, position))
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
            {issueItems.map((item, index) => (
              <SubmissionCard
                key={item.id}
                currentUserId={currentUser.id}
                issues={snapshot.issues}
                submission={item.submission}
                issueItem={item}
                mode="issue"
                isFirst={index === 0}
                isLast={index === issueItems.length - 1}
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
                  run(() => reorderIssueItemToPositionAction(issueItemId, position))
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
          <EmptyState title="当前期数没有投稿" description="从投稿库中加入投稿" />
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
        <ProfileMenu currentUser={currentUser} onClose={() => setOverlay("none")} />
      ) : null}
      {overlay === "issue" ? (
        <IssuePanel
          issues={snapshot.issues}
          currentIssueId={selectedIssueId}
          renameValue={renameValue}
          onRenameValueChange={setRenameValue}
          onClose={() => setOverlay("none")}
          onRename={() =>
            selectedIssueId
              ? run(() => renameIssueAction(selectedIssueId, renameValue))
              : undefined
          }
          onSelectIssue={(issueId) => {
            setOverlay("none");
            router.push(`/app?issue=${issueId}`);
          }}
          onCreateIssue={() =>
            startTransition(async () => {
              const issueId = await createIssueAction();
              setOverlay("none");
              router.push(`/app?issue=${issueId}`);
            })
          }
        />
      ) : null}
      {overlay === "filter" ? (
        <FilterSheet
          filter={filter}
          issues={snapshot.issues}
          onApply={setFilter}
          onClose={() => setOverlay("none")}
          onBatchAdd={(issueId, draftFilter) => {
            startTransition(async () => {
              await batchAddFilteredSubmissionsToIssueAction(issueId, draftFilter);
            });
            setFilter(draftFilter);
            setOverlay("none");
          }}
        />
      ) : null}
      {overlay === "sync" ? (
        <SyncConfirm
          lastSyncedAt={snapshot.lastSync?.finishedAt ?? null}
          syncing={syncing}
          error={syncError}
          progress={syncProgress}
          report={syncReport}
          onClose={() => setOverlay("none")}
          onConfirm={runStreamingSync}
        />
      ) : null}
    </main>
  );

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void action();
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

function TopBar({
  currentUser,
  syncing,
  onAvatarClick,
  onSync,
}: {
  currentUser: { displayName: string };
  syncing?: boolean;
  onAvatarClick: () => void;
  onSync: () => void;
}) {
  const initials = currentUser.displayName.slice(0, 1);

  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#F0F0F0] bg-white px-4">
      <span
        style={{
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "-0.3px",
          color: "#111",
        }}
      >
        全元光滑迷惑行为
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSync}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-[#F5F5F5] active:bg-[#EBEBEB]"
          aria-label="从飞书同步"
        >
          <RefreshCw
            size={17}
            className={cn("text-[#888]", syncing && "animate-spin")}
          />
        </button>
        <button
          type="button"
          onClick={onAvatarClick}
          className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white transition-transform active:scale-95"
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
}: {
  currentUser: { displayName: string; username: string };
  onClose: () => void;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative z-10 m-4 mt-14 overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-gradient-to-br from-[#FFF0F8] to-[#FFF] px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #FD80C2 0%, #F06292 100%)" }}
            >
              {currentUser.displayName.slice(0, 1)}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>
                {currentUser.displayName}
              </p>
              <p style={{ fontSize: 12, color: "#999" }}>
                {currentUser.username}@mihuoxingwei.com
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#F0F0F0]" />

        <button className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F5F5F5]">
          <div className="flex items-center gap-3">
            <User size={16} className="text-[#888]" />
            <span style={{ fontSize: 14, color: "#222" }}>账户管理</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 11, color: "#FD80C2", fontWeight: 500 }}>
              即将上线
            </span>
            <ChevronRight size={14} className="text-[#CCC]" />
          </div>
        </button>

        <div className="mx-4 h-px bg-[#F0F0F0]" />

        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F5F5F5]"
        >
          <div className="flex items-center gap-3">
            <Info size={16} className="text-[#888]" />
            <span style={{ fontSize: 14, color: "#222" }}>关于迷惑行为</span>
          </div>
          <ChevronRight size={14} className="text-[#CCC]" />
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

      {aboutOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-8">
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            aria-label="关闭关于迷惑行为"
            onClick={() => setAboutOpen(false)}
          />
          <section className="relative w-full max-w-80 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#111]">关于迷惑行为</h2>
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                className="grid size-7 place-items-center rounded-full bg-[#F5F5F5]"
                aria-label="关闭关于迷惑行为"
              >
                <X size={14} className="text-[#666]" />
              </button>
            </div>
            <p className="text-sm leading-6 text-[#555]">
              全元光滑迷惑行为编辑台，用于整理、筛选和排版投稿内容。
            </p>
            <p className="mt-4 text-xs font-medium text-[#999]">
              Credit by Vicky 2026
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function IssuePanel({
  issues,
  currentIssueId,
  renameValue,
  onRenameValueChange,
  onClose,
  onRename,
  onSelectIssue,
  onCreateIssue,
}: {
  issues: { id: string; title: string }[];
  currentIssueId: string | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onClose: () => void;
  onRename: () => void;
  onSelectIssue: (issueId: string) => void;
  onCreateIssue: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        aria-label="关闭期数面板"
        onClick={onClose}
      />
      <section className="relative z-10 flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-[#DDD]" />
        </div>
        <header className="flex flex-shrink-0 items-center justify-between px-4 py-3">
          <span style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>
            期数管理
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full hover:bg-[#F5F5F5]"
            aria-label="关闭期数面板"
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
            当前期数
          </p>
          {currentIssueId && renamingId === currentIssueId ? (
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
                onClick={() => {
                  onRename();
                  setRenamingId(null);
                }}
                className="rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: "#FD80C2", fontWeight: 500 }}
              >
                保存
              </button>
            </div>
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
              所有期数
            </p>
          </div>
          {issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => onSelectIssue(issue.id)}
              className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#FFF0F8]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-2 flex-shrink-0 rounded-full"
                  style={{
                    background: issue.id === currentIssueId ? "#FD80C2" : "#DDD",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    color: issue.id === currentIssueId ? "#FD80C2" : "#333",
                    fontWeight: issue.id === currentIssueId ? 600 : 400,
                  }}
                >
                  {issue.title}
                </span>
              </div>
              {issue.id === currentIssueId ? (
                <Check size={15} style={{ color: "#FD80C2" }} />
              ) : null}
            </button>
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
            新建期数
          </span>
        </button>
      </section>
    </div>
  );
}

function SyncConfirm({
  lastSyncedAt,
  syncing,
  error,
  progress,
  report,
  onClose,
  onConfirm,
}: {
  lastSyncedAt: Date | string | null;
  syncing: boolean;
  error: string | null;
  progress: SyncProgress;
  report: SyncReport | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const lastSyncText = lastSyncedAt
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(lastSyncedAt))
    : "从未同步";

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-center justify-center px-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="取消同步"
        onClick={onClose}
      />
      <section className="relative z-10 w-full max-w-80 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: "#FFF0F8" }}
          >
            <RefreshCw size={18} style={{ color: "#FD80C2" }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
              从飞书同步
            </p>
            <p style={{ fontSize: 11, color: "#AAA" }}>
              上次更新：{lastSyncText}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
          首次会拉取全部记录，之后只按飞书投稿日期增量拉取新内容。
        </p>
        {syncing ? (
          <div className="mb-4">
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#F1F1F3]">
              <div
                className="h-full rounded-full bg-[#FD80C2] transition-all"
                style={{
                  width: `${Math.min(
                    96,
                    Math.max(12, progress.scanned === 0 ? 12 : 42 + progress.created),
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
          <p
            className="mb-3 rounded-lg px-3 py-2"
            style={{ background: "#FFF3F3", color: "#DC2626", fontSize: 12 }}
          >
            {error}
          </p>
        ) : null}
        {report ? (
          <div
            className="mb-4 rounded-xl px-3 py-3"
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
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl bg-[#F5F5F5] py-2.5 transition-colors active:bg-[#EBEBEB]"
            style={{ fontSize: 14, color: "#666", fontWeight: 500 }}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl py-2.5 text-white transition-opacity active:opacity-90 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FD80C2 0%, #F06292 100%)",
              fontSize: 14,
              fontWeight: 600,
            }}
            disabled={syncing}
            onClick={onConfirm}
          >
            {syncing ? "同步中..." : report ? "再次刷新" : "开始同步"}
          </button>
        </div>
      </section>
    </div>
  );
}
