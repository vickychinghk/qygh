"use client";

import { useMemo, useTransition } from "react";
import { Download, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/editor/user-avatar";
import { SubmissionCard } from "@/components/editor/submission-card";
import { ExportPanel } from "@/components/editor/export-panel";
import type { DashboardSnapshot } from "@/lib/data";
import {
  addCommentAction,
  moveIssueItemAction,
  selectFinalCommentAction,
  setIssueItemConfirmedAction,
  toggleCommentStarAction,
  toggleSubmissionStarAction,
} from "@/app/app/actions";

export function EditorApp({
  currentUser,
  snapshot,
}: {
  currentUser: { id: string; displayName: string; username: string };
  snapshot: NonNullable<DashboardSnapshot>;
}) {
  const [isPending, startTransition] = useTransition();
  const issueItemsBySubmission = useMemo(() => {
    return new Map(
      snapshot.issue.items.map((item) => [item.submissionId, item]),
    );
  }, [snapshot.issue.items]);

  const confirmedCount = snapshot.issue.items.filter(
    (item) => item.confirmed,
  ).length;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-background pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">迷惑行为编辑台</h1>
            <p className="truncate text-xs text-muted-foreground">
              {snapshot.issue.title}
            </p>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="同步">
            <RefreshCw />
          </Button>
          <UserAvatar name={currentUser.displayName} />
        </div>
      </header>

      <Tabs defaultValue="library" className="w-full">
        <div className="sticky top-[65px] z-10 border-b bg-background px-4 py-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library">投稿库</TabsTrigger>
            <TabsTrigger value="issue">本期</TabsTrigger>
            <TabsTrigger value="export">导出</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="library" className="mt-0">
          {snapshot.submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              issueItem={issueItemsBySubmission.get(submission.id)}
              onStarSubmission={(submissionId) =>
                run(() => toggleSubmissionStarAction(submissionId))
              }
              onConfirm={(issueItemId, confirmed) =>
                run(() => setIssueItemConfirmedAction(issueItemId, confirmed))
              }
              onMove={(issueItemId, direction) =>
                run(() => moveIssueItemAction(issueItemId, direction))
              }
              onAddComment={(submissionId, body) =>
                run(() => addCommentAction(submissionId, body))
              }
              onStarComment={(commentId) =>
                run(() => toggleCommentStarAction(commentId))
              }
              onSelectComment={(submissionId, commentId) =>
                run(() => selectFinalCommentAction(submissionId, commentId))
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="issue" className="mt-0">
          {snapshot.issue.items.map((item) => (
            <SubmissionCard
              key={item.id}
              submission={item.submission}
              issueItem={item}
              showOrdering
              onStarSubmission={(submissionId) =>
                run(() => toggleSubmissionStarAction(submissionId))
              }
              onConfirm={(issueItemId, confirmed) =>
                run(() => setIssueItemConfirmedAction(issueItemId, confirmed))
              }
              onMove={(issueItemId, direction) =>
                run(() => moveIssueItemAction(issueItemId, direction))
              }
              onAddComment={(submissionId, body) =>
                run(() => addCommentAction(submissionId, body))
              }
              onStarComment={(commentId) =>
                run(() => toggleCommentStarAction(commentId))
              }
              onSelectComment={(submissionId, commentId) =>
                run(() => selectFinalCommentAction(submissionId, commentId))
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="export" className="mt-0">
          <ExportPanel
            issueId={snapshot.issue.id}
            confirmedCount={confirmedCount}
          />
        </TabsContent>
      </Tabs>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t bg-background px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" size="sm">
            <Filter data-icon="inline-start" />
            筛选
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={isPending}>
            已入选 {confirmedCount}
          </Button>
          <Button type="button" size="sm" asChild>
            <a href={`/api/export/${snapshot.issue.id}`} target="_blank">
              <Download data-icon="inline-start" />
              导出
            </a>
          </Button>
        </div>
      </nav>
    </main>
  );

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }
}
