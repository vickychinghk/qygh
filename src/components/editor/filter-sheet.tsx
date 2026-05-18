"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { IssueMenuButton } from "@/components/editor/issue-controls";
import { SCHOOL_OPTIONS, type SubmissionFilter } from "@/lib/selection-rules";
import { getSchoolTheme } from "@/lib/school-theme";

export const DEFAULT_SUBMISSION_FILTER: Required<SubmissionFilter> = {
  school: "",
  authorized: "all",
  assignStatus: "all",
  adoptStatus: "all",
  reactionStatus: "all",
  dateFrom: "",
  dateTo: "",
  serialFrom: "",
  serialTo: "",
};

type Issue = { id: string; title: string };
type BatchIntent =
  | { kind: "add"; issueId: string; issueTitle: string }
  | { kind: "remove" };
type MathChallenge = { left: number; right: number };

export function FilterSheet({
  filter,
  issues,
  workingIssueId,
  onApply,
  onClose,
  onBatchAdd,
  onBatchRemove,
}: {
  filter: Required<SubmissionFilter>;
  issues: Issue[];
  workingIssueId: string | null;
  onApply: (filter: Required<SubmissionFilter>) => void;
  onClose: () => void;
  onBatchAdd: (issueId: string, filter: Required<SubmissionFilter>) => void;
  onBatchRemove: (filter: Required<SubmissionFilter>) => void;
}) {
  const [draft, setDraft] = useState(filter);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchIntent, setBatchIntent] = useState<BatchIntent | null>(null);
  const [challenge, setChallenge] = useState<MathChallenge>(() =>
    createMathChallenge(),
  );
  const [challengeAnswer, setChallengeAnswer] = useState("");

  const activeCount = useMemo(
    () =>
      [
        draft.school,
        draft.authorized !== "all",
        draft.assignStatus !== "all",
        draft.adoptStatus !== "all",
        draft.reactionStatus !== "all",
        draft.dateFrom || draft.dateTo,
        draft.serialFrom || draft.serialTo,
      ].filter(Boolean).length,
    [draft],
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="关闭筛选"
        onClick={onClose}
      />
      <section className="relative z-10 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-[#DDD]" />
        </div>
        <header className="flex flex-shrink-0 items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>
              筛选
            </span>
            {activeCount > 0 ? (
              <span
                className="flex size-5 items-center justify-center rounded-full text-white"
                style={{ background: "#FD80C2", fontSize: 10, fontWeight: 700 }}
              >
                {activeCount}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full hover:bg-[#F5F5F5]"
            aria-label="关闭筛选"
          >
            <X size={16} className="text-[#888]" />
          </button>
        </header>

        <div className="h-px flex-shrink-0 bg-[#F0F0F0]" />

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          <Field label="学校">
            <div className="rounded-xl border border-[#DEE0E3] bg-white p-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SCHOOL_OPTIONS.map((school) => {
                  const theme = getSchoolTheme(school);
                  const selected = draft.school === school;

                  return (
                    <button
                      key={school}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          school: current.school === school ? "" : school,
                        }))
                      }
                      className="rounded-md px-2.5 py-1.5 transition-colors"
                      style={{
                        background: selected ? theme.ui.background : "#F5F6F7",
                        border: `1px solid ${selected ? theme.ui.border : "transparent"}`,
                        color: selected ? theme.ui.color : "#1F2329",
                        fontSize: 13,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {school}
                    </button>
                  );
                })}
              </div>
              <input
                value={draft.school}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, school: event.target.value }))
                }
                placeholder="输入其他学校或关键词"
                className="w-full rounded-lg border border-[#DEE0E3] bg-white px-3 py-2 outline-none transition-colors focus:border-[#FD80C2]"
                style={{ fontSize: 13, color: "#111" }}
              />
            </div>
          </Field>

          <Field label="投稿时间范围">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draft.dateFrom}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2 outline-none transition-colors focus:border-[#FD80C2]"
                style={{ fontSize: 13, color: draft.dateFrom ? "#111" : "#AAA" }}
              />
              <span style={{ fontSize: 12, color: "#CCC", flexShrink: 0 }}>至</span>
              <input
                type="date"
                value={draft.dateTo}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, dateTo: event.target.value }))
                }
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2 outline-none transition-colors focus:border-[#FD80C2]"
                style={{ fontSize: 13, color: draft.dateTo ? "#111" : "#AAA" }}
              />
            </div>
          </Field>

          <Segmented
            label="授权状态"
            value={draft.authorized}
            options={[
              ["all", "全部"],
              ["yes", "已授权"],
              ["no", "未授权"],
            ]}
            onChange={(authorized) =>
              setDraft((current) => ({ ...current, authorized }))
            }
          />
          <Segmented
            label="刊数归属"
            value={draft.assignStatus}
            options={[
              ["all", "全部"],
              ["assigned", "已分配"],
              ["unassigned", "未分配"],
            ]}
            onChange={(assignStatus) =>
              setDraft((current) => ({ ...current, assignStatus }))
            }
          />
          <Segmented
            label="采用状态"
            value={draft.adoptStatus}
            options={[
              ["all", "全部"],
              ["adopted", "已采用"],
              ["notAdopted", "未采用"],
            ]}
            onChange={(adoptStatus) =>
              setDraft((current) => ({ ...current, adoptStatus }))
            }
          />
          <Segmented
            label="点赞状态"
            value={draft.reactionStatus}
            options={[
              ["all", "全部"],
              ["liked", "我已点赞"],
              ["notLiked", "我未点赞"],
            ]}
            onChange={(reactionStatus) =>
              setDraft((current) => ({ ...current, reactionStatus }))
            }
          />

          <Field label="飞书序号范围">
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={draft.serialFrom}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    serialFrom: event.target.value,
                  }))
                }
                placeholder="最小"
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2 outline-none transition-colors focus:border-[#FD80C2]"
                style={{ fontSize: 13, color: "#111" }}
              />
              <span style={{ fontSize: 12, color: "#CCC", flexShrink: 0 }}>至</span>
              <input
                inputMode="numeric"
                value={draft.serialTo}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    serialTo: event.target.value,
                  }))
                }
                placeholder="最大"
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2 outline-none transition-colors focus:border-[#FD80C2]"
                style={{ fontSize: 13, color: "#111" }}
              />
            </div>
          </Field>
        </div>

        <div className="h-px flex-shrink-0 bg-[#F0F0F0]" />
        <footer className="flex flex-shrink-0 flex-col gap-2 px-4 pb-4 pt-3">
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-xl bg-[#F5F5F5] px-4 py-3 transition-colors active:bg-[#EBEBEB]"
              style={{ fontSize: 14, color: "#666", fontWeight: 500 }}
              onClick={() => setDraft(DEFAULT_SUBMISSION_FILTER)}
            >
              重置
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl py-3 text-white transition-opacity active:opacity-90"
              style={{
                background: "linear-gradient(135deg, #FD80C2 0%, #F06292 100%)",
                fontSize: 14,
                fontWeight: 600,
              }}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              应用筛选
            </button>
          </div>

          <button
            type="button"
            onClick={() => setBatchOpen((open) => !open)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all active:opacity-80"
            style={{
              background: batchOpen ? "#FFF0F8" : "#FFF8FC",
              border: "1.5px solid #FECDE8",
            }}
          >
            <span style={{ fontSize: 13, color: "#FD80C2", fontWeight: 500 }}>
              将筛选结果批量加入某期
            </span>
            <ChevronDown
              size={13}
              style={{
                color: "#FD80C2",
                transform: batchOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>

          {batchOpen ? (
            <div className="mt-2 overflow-hidden rounded-xl bg-white shadow-[0_6px_18px_rgba(31,35,41,0.08)]">
              <p style={{ fontSize: 11, color: "#FD80C2", padding: "8px 12px 4px", fontWeight: 500 }}>
                选择目标刊数（将应用当前筛选条件）：
              </p>
              <button
                type="button"
                onClick={() => openBatchConfirm({ kind: "remove" })}
                className="flex w-full items-center justify-between border-t border-[#F0F0F0] px-4 py-2.5 transition-colors active:bg-[#FFF0F8]"
              >
                <span style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>
                  移除刊数归属
                </span>
                <X size={13} style={{ color: "#FD80C2", opacity: 0.55 }} />
              </button>
              {issues.map((issue) => (
                <IssueMenuButton
                  key={issue.id}
                  issue={issue}
                  isWorking={issue.id === workingIssueId}
                  className="rounded-none border-t border-[#F0F0F0] px-4 py-2.5"
                  onClick={() =>
                    openBatchConfirm({
                      kind: "add",
                      issueId: issue.id,
                      issueTitle: issue.title,
                    })
                  }
                  right={<Check size={13} style={{ color: "#FD80C2", opacity: 0.5 }} />}
                />
              ))}
            </div>
          ) : null}
        </footer>
      </section>
      {batchIntent ? (
        <BatchConfirmDialog
          intent={batchIntent}
          challenge={challenge}
          answer={challengeAnswer}
          onAnswerChange={setChallengeAnswer}
          onCancel={() => setBatchIntent(null)}
          onConfirm={() => {
            if (challengeAnswer.trim() !== String(challenge.left + challenge.right)) {
              return;
            }

            if (batchIntent.kind === "add") {
              onBatchAdd(batchIntent.issueId, draft);
            } else {
              onBatchRemove(draft);
            }
          }}
        />
      ) : null}
    </div>
  );

  function openBatchConfirm(intent: BatchIntent) {
    setChallenge(createMathChallenge());
    setChallengeAnswer("");
    setBatchIntent(intent);
  }
}

function createMathChallenge(): MathChallenge {
  return {
    left: Math.floor(Math.random() * 8) + 2,
    right: Math.floor(Math.random() * 8) + 2,
  };
}

function BatchConfirmDialog({
  intent,
  challenge,
  answer,
  onAnswerChange,
  onCancel,
  onConfirm,
}: {
  intent: BatchIntent;
  challenge: MathChallenge;
  answer: string;
  onAnswerChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const expected = challenge.left + challenge.right;
  const valid = answer.trim() === String(expected);
  const title = intent.kind === "add" ? "确认批量移动刊数" : "确认批量移除归属";
  const description =
    intent.kind === "add"
      ? `这会把当前筛选结果加入「${intent.issueTitle}」，并移除它们原有的其他刊数归属。`
      : "这会移除当前筛选结果的刊数归属。";

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center px-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="取消批量操作确认"
        onClick={onCancel}
      />
      <section className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#111]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#666]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-7 flex-shrink-0 place-items-center rounded-full bg-[#F5F5F5]"
            aria-label="关闭批量操作确认"
          >
            <X size={14} className="text-[#666]" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-3">
          <label className="block">
            <span className="text-xs font-medium text-[#888]">
              输入计算结果：{challenge.left} + {challenge.right}
            </span>
            <input
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              inputMode="numeric"
              className="mt-2 w-full rounded-lg border border-[#DEE0E3] bg-white px-3 py-2 text-sm text-[#111] outline-none focus:border-[#FD80C2]"
              placeholder="答案"
              autoFocus
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-[#F5F5F5] py-2.5 text-sm font-medium text-[#666]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "#FD80C2" }}
          >
            确认
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span
        style={{
          fontSize: 12,
          color: "#888",
          fontWeight: 500,
          display: "block",
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p style={{ fontSize: 12, color: "#888", fontWeight: 500, marginBottom: 8 }}>{label}</p>
      <div className="flex gap-2">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="flex-1 rounded-xl py-2 transition-all"
            style={{
              background: value === option ? "#FFF0F8" : "#F5F5F5",
              color: value === option ? "#FD80C2" : "#555",
              fontWeight: value === option ? 600 : 400,
              border: value === option ? "1.5px solid #FECDE8" : "1.5px solid transparent",
              fontSize: 13,
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
