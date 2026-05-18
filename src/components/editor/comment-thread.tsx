"use client";

import { useState, useTransition } from "react";
import { Check, Heart, PencilLine, Send, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasUserReacted } from "@/lib/selection-rules";

type Comment = {
  id: string;
  body: string;
  selected: boolean;
  source: string;
  authorId: string | null;
  createdAt?: Date | string;
  author?: { displayName: string } | null;
  reactions: {
    id: string;
    userId?: string | null;
    user?: { displayName: string } | null;
  }[];
};

export function CommentThread({
  currentUserId,
  submissionId,
  comments,
  onAddComment,
  onHeartComment,
  onSelectComment,
  onUpdateComment,
  onDeleteComment,
}: {
  currentUserId: string;
  submissionId: string;
  comments: Comment[];
  onAddComment: (submissionId: string, body: string) => void | Promise<void>;
  onHeartComment: (commentId: string) => void | Promise<void>;
  onSelectComment: (
    submissionId: string,
    commentId: string,
  ) => void | Promise<void>;
  onUpdateComment: (commentId: string, body: string) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shownComments = expanded ? comments : comments.slice(0, 3);

  return (
    <section className="border-t border-[#f0f0f2] bg-[#fafafa]">
      <div className="px-3 pb-1 pt-2">
        {shownComments.length > 0 ? (
          shownComments.map((comment) => {
            const isSubmitter = comment.source === "SUBMITTER";
            const authorName = isSubmitter
              ? "投稿人"
              : comment.author?.displayName ?? "编辑";
            const isOwn = comment.authorId === currentUserId && !isSubmitter;
            const heartNames = comment.reactions
              .map((reaction) => reaction.user?.displayName)
              .filter(Boolean)
              .join("、");
            const reactedByCurrentUser = hasUserReacted(
              comment.reactions,
              currentUserId,
            );
            const editing = editingId === comment.id;
            const confirmingDelete = deleteConfirmId === comment.id;

            return (
              <div
                key={comment.id}
                className="border-b border-[#f0f0f2] py-2 last:border-0"
              >
                {editing ? (
                  <div className="mb-1.5 flex flex-col gap-2">
                    <Textarea
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                      className="min-h-16 resize-none rounded-lg border-primary/30 bg-[#fff8fc] text-sm focus-visible:ring-primary"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-8 flex-1 rounded-lg bg-[#f0f0f2] text-xs text-muted-foreground"
                        onClick={() => {
                          setEditingId(null);
                          setEditingBody("");
                        }}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="h-8 flex-1 rounded-lg bg-primary text-xs font-semibold text-white"
                        onClick={() =>
                          startTransition(async () => {
                            await onUpdateComment(comment.id, editingBody);
                            setEditingId(null);
                            setEditingBody("");
                          })
                        }
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] leading-5 text-foreground/85">
                    <span className="font-semibold text-foreground">{authorName}</span>
                    <span>：{comment.body}</span>
                  </p>
                )}

                {!editing ? (
                  <div className="mt-1 flex min-h-7 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onHeartComment(comment.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-1",
                        reactedByCurrentUser ? "text-primary" : "text-[#b9bbc1]",
                      )}
                      aria-label="点赞吐槽"
                    >
                      <Heart
                        className="size-3.5"
                        fill={reactedByCurrentUser ? "currentColor" : "none"}
                      />
                      <span className="text-[11px]">{comment.reactions.length}</span>
                    </button>
                    {heartNames ? (
                      <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[10px] text-muted-foreground">
                        {heartNames}
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1" />
                    )}

                    {isOwn && !confirmingDelete ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditingBody(comment.body);
                          }}
                          className="grid size-7 place-items-center rounded text-muted-foreground"
                          aria-label="编辑吐槽"
                        >
                          <PencilLine className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (comment.selected) {
                              window.alert("已采用，需先取消采用");
                              return;
                            }
                            setDeleteConfirmId(comment.id);
                          }}
                          className="grid size-7 place-items-center rounded text-muted-foreground"
                          aria-label="删除吐槽"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    ) : null}

                    {isOwn && confirmingDelete ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[10px] text-destructive">确定删除？</span>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-md bg-[#f0f0f2] px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              await onDeleteComment(comment.id);
                              setDeleteConfirmId(null);
                            })
                          }
                          className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                        >
                          删除
                        </button>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void onSelectComment(submissionId, comment.id)}
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full",
                        comment.selected
                          ? "bg-primary text-white"
                          : "bg-white text-muted-foreground",
                      )}
                      aria-label={comment.selected ? "取消采用吐槽" : "采用吐槽"}
                    >
                      <Check className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="py-1 text-xs text-muted-foreground">还没有吐槽，快来补刀...</p>
        )}

        {comments.length > 3 && !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="py-1 text-xs font-medium text-primary"
          >
            显示全部 {comments.length} 条吐槽
          </button>
        ) : null}
      </div>

      <form
        className="flex items-center gap-2 px-3 pb-3 pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            await onAddComment(submissionId, body);
            setBody("");
          });
        }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="来一句吐槽"
          className="h-10 min-w-0 flex-1 rounded-full bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white disabled:bg-[#f0f0f2] disabled:text-[#c7c7ce]"
          aria-label="发布吐槽"
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}
