"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportPanel({
  issueId,
  confirmedCount,
}: {
  issueId: string;
  confirmedCount: number;
}) {
  return (
    <section className="flex flex-col gap-4 px-4 py-5">
      <div className="rounded-lg border bg-background p-4">
        <h2 className="text-base font-semibold">公众号 HTML 导出</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          当前会导出本期已入选的 {confirmedCount} 条投稿，并按本期排序输出。
          微信公众号固定排版模板后续接入。
        </p>
        <Button asChild className="mt-4 w-full">
          <a href={`/api/export/${issueId}`} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" />
            打开 HTML
          </a>
        </Button>
      </div>
    </section>
  );
}
