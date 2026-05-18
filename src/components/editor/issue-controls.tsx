"use client";

import type React from "react";
import { cn } from "@/lib/utils";

export type IssueSummary = {
  id: string;
  title: string;
};

export function WorkingIssueBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-[#FFF0F8] font-semibold text-primary",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[10px]",
      )}
    >
      工作中
    </span>
  );
}

export function SetWorkingIssueChip({
  onClick,
}: {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full bg-[#F5F5F5] px-2 py-1 text-[10px] font-semibold text-[#999] active:bg-[#FFF0F8] active:text-primary"
    >
      设为工作中
    </button>
  );
}

export function IssueTitleLine({
  title,
  isWorking,
  active,
}: {
  title: string;
  isWorking: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        active ? "text-primary" : "text-[#333]",
      )}
    >
      <span className="min-w-0 truncate">{title}</span>
      {isWorking ? <WorkingIssueBadge compact /> : null}
    </span>
  );
}

export function IssueMenuButton({
  issue,
  active,
  isWorking,
  right,
  onClick,
  className,
}: {
  issue: IssueSummary;
  active?: boolean;
  isWorking: boolean;
  right?: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
        active
          ? "bg-[#fff0f8] font-semibold text-primary"
          : "text-[#1f2329] active:bg-[#f5f6f7]",
        className,
      )}
    >
      <IssueTitleLine title={issue.title} isWorking={isWorking} active={active} />
      {right ? <span className="shrink-0">{right}</span> : null}
    </button>
  );
}
