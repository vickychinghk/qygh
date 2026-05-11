"use client";

import { useState, useTransition } from "react";
import { Check, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/editor/user-avatar";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  body: string;
  selected: boolean;
  author: { displayName: string };
  reactions: { id: string }[];
};

export function CommentThread({
  submissionId,
  comments,
  onAddComment,
  onStarComment,
  onSelectComment,
}: {
  submissionId: string;
  comments: Comment[];
  onAddComment: (submissionId: string, body: string) => void | Promise<void>;
  onStarComment: (commentId: string) => void | Promise<void>;
  onSelectComment: (
    submissionId: string,
    commentId: string,
  ) => void | Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-md bg-secondary/70 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">编辑吐槽</p>
        <p className="text-xs text-muted-foreground">最终只选一条</p>
      </div>

      <div className="flex flex-col gap-2">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "flex gap-2 rounded-md border bg-background p-2",
              comment.selected && "border-primary",
            )}
          >
            <UserAvatar name={comment.author.displayName} className="size-7" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5">{comment.body}</p>
              <div className="mt-2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    startTransition(() => {
                      void onStarComment(comment.id);
                    })
                  }
                >
                  <Star data-icon="inline-start" />
                  {comment.reactions.length}
                </Button>
                <Button
                  type="button"
                  variant={comment.selected ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    startTransition(() => {
                      void onSelectComment(submissionId, comment.id);
                    })
                  }
                >
                  <Check data-icon="inline-start" />
                  {comment.selected ? "已采用" : "采用"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            await onAddComment(submissionId, body);
            setBody("");
          });
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="写一句编辑吐槽"
          className="min-h-16 resize-none"
        />
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          <Send data-icon="inline-start" />
          发送吐槽
        </Button>
      </form>
    </div>
  );
}
