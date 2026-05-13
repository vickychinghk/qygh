"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Heart,
  ImageOff,
  Plus,
  Video,
  X,
} from "lucide-react";
import { CommentThread } from "@/components/editor/comment-thread";
import { cn } from "@/lib/utils";
import {
  getSubmissionIssueLabel,
  hasUserReacted,
  SCHOOL_OPTIONS,
  sortImagesForEditing,
} from "@/lib/selection-rules";

type Reaction = {
  id: string;
  userId?: string | null;
  user?: { displayName: string } | null;
};

type Issue = {
  id: string;
  title: string;
};

type SubmissionImage = {
  id: string;
  localPath: string;
  assetKind?: string | null;
  processingStatus?: string | null;
  processingError?: string | null;
  enabled?: boolean | null;
  updatedAt?: Date | string | null;
  sortOrder?: number;
};

type Submission = {
  id: string;
  school: string;
  submitterQuote: string;
  consentGranted: boolean;
  submittedAt: Date;
  serialNumber: string | null;
  images: SubmissionImage[];
  issueItems: { issueId?: string; confirmed?: boolean; issue: { title: string } }[];
  comments: {
    id: string;
    body: string;
    selected: boolean;
    source: string;
    authorId: string | null;
    author?: { displayName: string } | null;
    reactions: Reaction[];
  }[];
  reactions: Reaction[];
};

export function SubmissionCard({
  currentUserId,
  issues,
  submission,
  issueItem,
  mode,
  isFirst,
  isLast,
  onHeartSubmission,
  onConfirmSubmission,
  onMove,
  onMoveToPosition,
  onAddToIssue,
  onMoveToIssue,
  onRemoveFromIssue,
  onUpdateSchool,
  onToggleImageEnabled,
  onAddImage,
  onAddComment,
  onHeartComment,
  onSelectComment,
  onUpdateComment,
  onDeleteComment,
}: {
  currentUserId: string;
  issues: Issue[];
  submission: Submission;
  issueItem?: { id: string; confirmed: boolean; sortOrder: number } | null;
  mode: "library" | "issue";
  isFirst?: boolean;
  isLast?: boolean;
  onHeartSubmission: (submissionId: string) => void | Promise<void>;
  onConfirmSubmission: (
    submissionId: string,
    confirmed: boolean,
  ) => void | Promise<void>;
  onMove: (
    issueItemId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
  onMoveToPosition: (issueItemId: string, position: number) => void | Promise<void>;
  onAddToIssue: (issueId: string, submissionId: string) => void | Promise<void>;
  onMoveToIssue: (submissionId: string, issueId: string) => void | Promise<void>;
  onRemoveFromIssue: (submissionId: string) => void | Promise<void>;
  onUpdateSchool: (submissionId: string, school: string) => void | Promise<void>;
  onToggleImageEnabled: (imageId: string, enabled: boolean) => void | Promise<void>;
  onAddImage: (formData: FormData) => void | Promise<void>;
  onAddComment: (submissionId: string, body: string) => void | Promise<void>;
  onHeartComment: (commentId: string) => void | Promise<void>;
  onSelectComment: (
    submissionId: string,
    commentId: string,
  ) => void | Promise<void>;
  onUpdateComment: (commentId: string, body: string) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
}) {
  const confirmed = Boolean(issueItem?.confirmed);

  return (
    <article
      className="relative overflow-hidden bg-white"
      style={{
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        marginBottom: 10,
      }}
    >
      {mode === "issue" && issueItem ? (
        <IssueOrderHeader
          issueItem={issueItem}
          submissionId={submission.id}
          confirmed={confirmed}
          isFirst={Boolean(isFirst)}
          isLast={Boolean(isLast)}
          onMove={onMove}
          onMoveToPosition={onMoveToPosition}
          onConfirmSubmission={onConfirmSubmission}
        />
      ) : null}

      <ImageGrid
        submission={submission}
        onToggleImageEnabled={onToggleImageEnabled}
        onAddImage={onAddImage}
      />

      <SubmissionMeta
        mode={mode}
        submission={submission}
        issues={issues}
        onUpdateSchool={onUpdateSchool}
        onAddToIssue={onAddToIssue}
        onMoveToIssue={onMoveToIssue}
        onRemoveFromIssue={onRemoveFromIssue}
      />

      <InteractionRow
        currentUserId={currentUserId}
        submission={submission}
        onHeartSubmission={onHeartSubmission}
      />

      <CommentThread
        currentUserId={currentUserId}
        submissionId={submission.id}
        comments={submission.comments}
        onAddComment={onAddComment}
        onHeartComment={onHeartComment}
        onSelectComment={onSelectComment}
        onUpdateComment={onUpdateComment}
        onDeleteComment={onDeleteComment}
      />
    </article>
  );
}

function ImageGrid({
  submission,
  onToggleImageEnabled,
  onAddImage,
}: {
  submission: Submission;
  onToggleImageEnabled: (imageId: string, enabled: boolean) => void | Promise<void>;
  onAddImage: (formData: FormData) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const images = sortImagesForEditing(submission.images);
  const lightboxIndex = lightboxId
    ? images.findIndex((image) => image.id === lightboxId)
    : -1;
  const lightboxImage = lightboxIndex >= 0 ? images[lightboxIndex] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 bg-white">
        {images.map((image) => {
          const enabled = image.enabled !== false;
          return (
            <ImageTile
              key={image.id}
              image={image}
              enabled={enabled}
              alt={`${submission.school} 投稿图片`}
              onOpen={() => setLightboxId(image.id)}
            />
          );
        })}

        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="grid aspect-square place-items-center bg-[#f4f4f6] text-[#b7b7bf] transition-colors active:bg-[#ececf0]"
          aria-label="添加图片"
        >
          <Plus className="size-5" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            const formData = new FormData();
            formData.set("submissionId", submission.id);
            formData.set("file", file);
            startTransition(async () => {
              await onAddImage(formData);
              event.target.value = "";
            });
          }}
        />
      </div>

      {lightboxImage ? (
        <ImageLightbox
          image={lightboxImage}
          index={lightboxIndex}
          total={images.length}
          onClose={() => setLightboxId(null)}
          onPrev={
            lightboxIndex > 0 ? () => setLightboxId(images[lightboxIndex - 1].id) : undefined
          }
          onNext={
            lightboxIndex < images.length - 1
              ? () => setLightboxId(images[lightboxIndex + 1].id)
              : undefined
          }
          onToggleImageEnabled={onToggleImageEnabled}
        />
      ) : null}
    </>
  );
}

function ImageTile({
  image,
  enabled,
  alt,
  onOpen,
}: {
  image: SubmissionImage;
  enabled: boolean;
  alt: string;
  onOpen: () => void;
}) {
  const [errored, setErrored] = useState(false);
  const unsupported = unsupportedAssetLabel(image);

  return (
    <button
      type="button"
      className="relative aspect-square overflow-hidden bg-white"
      onClick={onOpen}
    >
      {unsupported ? (
        <AssetPlaceholder kind={image.assetKind} label={unsupported} />
      ) : errored ? (
        <AssetPlaceholder kind="UNSUPPORTED" label="图片出错" />
      ) : (
        <Image
          src={image.localPath}
          alt={alt}
          fill
          sizes="(max-width: 448px) 33vw, 146px"
          className={cn("object-cover", !enabled && "opacity-40 grayscale")}
          onError={() => setErrored(true)}
        />
      )}
      <span
        className={cn(
          "absolute right-1 top-1 grid size-5 place-items-center rounded-full",
          enabled ? "bg-primary text-primary-foreground" : "bg-black/45 text-white",
        )}
      >
        {enabled ? <Check className="size-3" /> : <EyeOff className="size-3" />}
      </span>
    </button>
  );
}

function AssetPlaceholder({
  kind,
  label,
}: {
  kind?: string | null;
  label: string;
}) {
  const Icon = kind === "VIDEO" ? Video : ImageOff;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fbfbfc] px-3 text-center">
      <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-[#f0f0f2] text-[#9b9ba3]">
        <Icon className="size-4" />
      </div>
      <span className="text-xs font-semibold text-[#777780]">{label}</span>
    </div>
  );
}

function unsupportedAssetLabel(image: SubmissionImage) {
  if (image.assetKind === "VIDEO") {
    return "暂不支持视频";
  }

  if (image.processingStatus === "FAILED") {
    return "图片处理失败";
  }

  if (image.assetKind === "UNSUPPORTED") {
    return "暂不支持此格式";
  }

  return null;
}

function ImageLightbox({
  image,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onToggleImageEnabled,
}: {
  image: SubmissionImage;
  index: number;
  total: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleImageEnabled: (imageId: string, enabled: boolean) => void | Promise<void>;
}) {
  const enabled = image.enabled !== false;
  const unsupported = unsupportedAssetLabel(image);

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col bg-black/95">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full bg-white/15 text-white"
          aria-label="关闭图片预览"
        >
          <X className="size-4" />
        </button>
        <span className="text-sm text-white/60">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => void onToggleImageEnabled(image.id, !enabled)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
            enabled ? "bg-primary text-white" : "bg-white/15 text-white/60",
          )}
        >
          {enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {enabled ? "已启用" : "已停用"}
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto">
        {onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white"
            aria-label="上一张"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white"
            aria-label="下一张"
          >
            <ChevronRight className="size-5" />
          </button>
        ) : null}
        <div className="flex min-h-full items-center justify-center px-12 py-4">
          {unsupported ? (
            <div className="relative h-48 w-full max-w-xs overflow-hidden rounded-md">
              <AssetPlaceholder kind={image.assetKind} label={unsupported} />
            </div>
          ) : (
            <Image
              src={image.localPath}
              alt="投稿图片预览"
              width={1200}
              height={1600}
              className={cn(
                "h-auto max-h-none w-auto max-w-full rounded-md object-contain",
                !enabled && "opacity-50 grayscale",
              )}
            />
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-center pb-6 pt-2">
        <span className="rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-[11px] text-primary">
          {enabled ? "导出时将包含此图片" : "导出时不包含此图片"}
        </span>
      </div>
    </div>
  );
}

function SubmissionMeta({
  mode,
  submission,
  issues,
  onUpdateSchool,
  onAddToIssue,
  onMoveToIssue,
  onRemoveFromIssue,
}: {
  mode: "library" | "issue";
  submission: Submission;
  issues: Issue[];
  onUpdateSchool: (submissionId: string, school: string) => void | Promise<void>;
  onAddToIssue: (issueId: string, submissionId: string) => void | Promise<void>;
  onMoveToIssue: (submissionId: string, issueId: string) => void | Promise<void>;
  onRemoveFromIssue: (submissionId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const isPreset = SCHOOL_OPTIONS.includes(submission.school as (typeof SCHOOL_OPTIONS)[number]);

  function selectSchool(school: string) {
    void onUpdateSchool(submission.id, school);
    setCustomValue("");
    setOpen(false);
  }

  return (
    <div className="relative z-40 px-3 py-2">
      <div className="relative flex items-start justify-between gap-2">
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => {
              setCustomValue(isPreset ? "" : submission.school);
              setOpen((current) => !current);
            }}
            className="flex max-w-full items-center gap-1 py-1 text-left"
          >
            <span className="truncate text-[13px] font-semibold text-[#1f2329]">
              {submission.school}
            </span>
            {!isPreset ? (
              <span className="text-[9px] font-semibold text-[#8f959e]">
                其他
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "size-3 text-[#8f959e] transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {open ? (
            <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-64 rounded-xl bg-white p-2 shadow-[0_8px_28px_rgba(31,35,41,0.14)]">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SCHOOL_OPTIONS.map((school) => (
                  <button
                    key={school}
                    type="button"
                    onClick={() => {
                      if (school === "其他") {
                        setCustomValue(isPreset ? "" : submission.school);
                        return;
                      }
                      selectSchool(school);
                    }}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs transition-colors",
                      submission.school === school
                        ? "bg-[#fdeff7] font-semibold text-primary"
                        : "bg-[#f5f6f7] text-[#1f2329] active:bg-[#eff0f1]",
                    )}
                  >
                    {school}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  placeholder={!isPreset ? submission.school : "输入其他学校"}
                  className="min-w-0 flex-1 rounded-md border border-[#dee0e3] bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!customValue.trim()}
                  onClick={() => selectSchool(customValue)}
                  className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                >
                  确定
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <IssuePopover
          mode={mode}
          submission={submission}
          issues={issues}
          onAddToIssue={onAddToIssue}
          onMoveToIssue={onMoveToIssue}
          onRemoveFromIssue={onRemoveFromIssue}
        />
      </div>

    </div>
  );
}

function IssuePopover({
  mode,
  submission,
  issues,
  onAddToIssue,
  onMoveToIssue,
  onRemoveFromIssue,
}: {
  mode: "library" | "issue";
  submission: Submission;
  issues: Issue[];
  onAddToIssue: (issueId: string, submissionId: string) => void | Promise<void>;
  onMoveToIssue: (submissionId: string, issueId: string) => void | Promise<void>;
  onRemoveFromIssue: (submissionId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const assigned = submission.issueItems[0];
  const assignedIssueId = assigned?.issueId;

  return (
    <div className="relative max-w-[52%] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex max-w-full items-center gap-1 py-1 text-[12px] font-medium",
          assigned
            ? "text-primary"
            : "text-[#646a73]",
        )}
      >
        <span className="truncate">{getSubmissionIssueLabel(submission.issueItems)}</span>
        <ChevronDown
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-60 overflow-hidden rounded-xl bg-white shadow-[0_8px_28px_rgba(31,35,41,0.14)]">
          <div className="max-h-56 overflow-y-auto p-1.5">
            {issues.map((issue) => {
              const active = issue.id === assignedIssueId;
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => {
                    if (!active) {
                      if (mode === "library" && !assigned) {
                        void onAddToIssue(issue.id, submission.id);
                      } else {
                        void onMoveToIssue(submission.id, issue.id);
                      }
                    }
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                    active
                      ? "bg-[#fff0f8] font-semibold text-primary"
                      : "text-[#1f2329] active:bg-[#f5f6f7]",
                  )}
                >
                  <span className="truncate">{issue.title}</span>
                  {active ? <Check className="size-3 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
          {assigned ? (
            <div className="border-t border-[#eff0f1] p-1.5">
              <button
                type="button"
                onClick={() => {
                  void onRemoveFromIssue(submission.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#dc2626] active:bg-[#fff3f3]"
              >
                <X className="size-3" />
                移除期数归属
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InteractionRow({
  currentUserId,
  submission,
  onHeartSubmission,
}: {
  currentUserId: string;
  submission: Submission;
  onHeartSubmission: (submissionId: string) => void | Promise<void>;
}) {
  const heartNames = submission.reactions
    .map((reaction) => reaction.user?.displayName)
    .filter(Boolean)
    .join("、");
  const reactedByCurrentUser = hasUserReacted(submission.reactions, currentUserId);
  const submittedAt = new Date(submission.submittedAt);
  const submittedDateText = `${submittedAt.getMonth() + 1}月${submittedAt.getDate()}`;

  return (
    <div className="flex min-h-11 items-center gap-2 border-t border-[#f4f4f6] px-3 py-2">
      <button
        type="button"
        onClick={() => void onHeartSubmission(submission.id)}
        className={cn(
          "flex shrink-0 items-center gap-1.5",
          reactedByCurrentUser ? "text-primary" : "text-[#b9bbc1]",
        )}
        aria-label="点赞投稿"
      >
        <Heart className="size-4" fill={reactedByCurrentUser ? "currentColor" : "none"} />
        <span className="min-w-4 text-sm font-semibold">
          {submission.reactions.length}
        </span>
      </button>
      {heartNames ? (
        <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs text-muted-foreground">
          {heartNames}
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      <div className="shrink-0 text-right leading-4">
        <div
          className={cn(
            "text-[11px] font-semibold",
            submission.consentGranted ? "text-[#16a34a]" : "text-[#dc2626]",
          )}
        >
          {submission.consentGranted ? "已授权" : "未授权"}
        </div>
        <div className="text-[11px] text-muted-foreground">{submittedDateText}</div>
      </div>
    </div>
  );
}

function IssueOrderHeader({
  issueItem,
  submissionId,
  confirmed,
  isFirst,
  isLast,
  onMove,
  onMoveToPosition,
  onConfirmSubmission,
}: {
  issueItem: { id: string; sortOrder: number };
  submissionId: string;
  confirmed: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (issueItemId: string, direction: "up" | "down") => void | Promise<void>;
  onMoveToPosition: (issueItemId: string, position: number) => void | Promise<void>;
  onConfirmSubmission: (
    submissionId: string,
    confirmed: boolean,
  ) => void | Promise<void>;
}) {
  const [value, setValue] = useState(String(issueItem.sortOrder));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setValue(String(issueItem.sortOrder));
    }
  }, [focused, issueItem.sortOrder]);

  function commit() {
    setFocused(false);
    const position = Number.parseInt(value, 10);
    if (Number.isFinite(position) && position > 0 && position !== issueItem.sortOrder) {
      void onMoveToPosition(issueItem.id, position);
      return;
    }

    setValue(String(issueItem.sortOrder));
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-3 py-2",
        confirmed
          ? "border-primary/30 bg-gradient-to-r from-[#fff0f8] to-[#fff8fc]"
          : "border-[#ebebef] bg-gradient-to-r from-[#f7f7f8] to-[#ffffff]",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-primary">No.</span>
        <input
          value={value}
          inputMode="numeric"
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setValue(String(issueItem.sortOrder));
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-12 rounded-lg border border-primary/30 bg-white text-center text-base font-bold text-primary outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void onConfirmSubmission(submissionId, !confirmed)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px]",
            confirmed
              ? "font-semibold text-primary"
              : "text-muted-foreground",
          )}
          aria-label={confirmed ? "取消采用投稿" : "采用投稿"}
        >
          <Check className="size-3.5" />
          {confirmed ? "已采用" : "采用"}
        </button>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-lg border border-[#FECDE8] bg-[#FFE8F5] transition-colors active:bg-[#FECDE8] disabled:opacity-30"
          disabled={isFirst}
          onClick={() => void onMove(issueItem.id, "up")}
          aria-label="上移"
        >
          <ChevronUp size={14} style={{ color: "#FD80C2" }} />
        </button>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-lg border border-[#FECDE8] bg-[#FFE8F5] transition-colors active:bg-[#FECDE8] disabled:opacity-30"
          disabled={isLast}
          onClick={() => void onMove(issueItem.id, "down")}
          aria-label="下移"
        >
          <ChevronDown size={14} style={{ color: "#FD80C2" }} />
        </button>
      </div>
    </div>
  );
}
