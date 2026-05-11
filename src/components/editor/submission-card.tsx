"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Check, Clock, School, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "@/components/editor/comment-thread";
import { cn } from "@/lib/utils";

type Submission = {
  id: string;
  school: string;
  submitterQuote: string;
  consentGranted: boolean;
  submittedAt: Date;
  images: { id: string; localPath: string }[];
  comments: {
    id: string;
    body: string;
    selected: boolean;
    author: { displayName: string };
    reactions: { id: string }[];
  }[];
  reactions: { id: string }[];
};

export function SubmissionCard({
  submission,
  issueItem,
  showOrdering = false,
  onStarSubmission,
  onConfirm,
  onMove,
  onAddComment,
  onStarComment,
  onSelectComment,
}: {
  submission: Submission;
  issueItem?: { id: string; confirmed: boolean; sortOrder: number } | null;
  showOrdering?: boolean;
  onStarSubmission: (submissionId: string) => void | Promise<void>;
  onConfirm: (issueItemId: string, confirmed: boolean) => void | Promise<void>;
  onMove: (
    issueItemId: string,
    direction: "up" | "down",
  ) => void | Promise<void>;
  onAddComment: (submissionId: string, body: string) => void | Promise<void>;
  onStarComment: (commentId: string) => void | Promise<void>;
  onSelectComment: (
    submissionId: string,
    commentId: string,
  ) => void | Promise<void>;
}) {
  const confirmed = Boolean(issueItem?.confirmed);

  return (
    <article
      className={cn(
        "flex flex-col gap-3 border-b bg-background px-4 py-4",
        confirmed && "bg-emerald-50/40",
      )}
    >
      <div className="flex gap-3">
        <div className="grid size-20 shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-md border bg-secondary">
          {submission.images.slice(0, 4).map((image) => (
            <Image
              key={image.id}
              src={image.localPath}
              alt={`${submission.school} 投稿图片`}
              width={80}
              height={80}
              className="size-full object-cover"
            />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <School data-icon="inline-start" className="text-muted-foreground" />
            <h2 className="truncate text-sm font-semibold">
              {submission.school}
            </h2>
            <Badge variant={submission.consentGranted ? "secondary" : "outline"}>
              {submission.consentGranted ? "已同意" : "待确认"}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5">
            {submission.submitterQuote}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock data-icon="inline-start" />
            {new Intl.DateTimeFormat("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(submission.submittedAt))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onStarSubmission(submission.id)}
          className="text-amber-700"
        >
          <Star data-icon="inline-start" />
          {submission.reactions.length}
        </Button>
        {issueItem ? (
          <Button
            type="button"
            variant={confirmed ? "default" : "outline"}
            size="sm"
            onClick={() => void onConfirm(issueItem.id, !confirmed)}
          >
            <Check data-icon="inline-start" />
            {confirmed ? "已入选" : "入选"}
          </Button>
        ) : null}
        {showOrdering && issueItem ? (
          <div className="ml-auto flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void onMove(issueItem.id, "up")}
              aria-label="上移"
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void onMove(issueItem.id, "down")}
              aria-label="下移"
            >
              <ArrowDown />
            </Button>
          </div>
        ) : null}
      </div>

      <Separator />
      <CommentThread
        submissionId={submission.id}
        comments={submission.comments}
        onAddComment={onAddComment}
        onStarComment={onStarComment}
        onSelectComment={onSelectComment}
      />
    </article>
  );
}
