"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { SCHOOL_OPTIONS, type SubmissionFilter } from "@/lib/selection-rules";
import { getSchoolTheme } from "@/lib/school-theme";

export const DEFAULT_SUBMISSION_FILTER: Required<SubmissionFilter> = {
  school: "",
  authorized: "all",
  assignStatus: "all",
  adoptStatus: "all",
  dateFrom: "",
  dateTo: "",
  serialFrom: "",
  serialTo: "",
};

type Issue = { id: string; title: string };

export function FilterSheet({
  filter,
  issues,
  onApply,
  onClose,
  onBatchAdd,
}: {
  filter: Required<SubmissionFilter>;
  issues: Issue[];
  onApply: (filter: Required<SubmissionFilter>) => void;
  onClose: () => void;
  onBatchAdd: (issueId: string, filter: Required<SubmissionFilter>) => void;
}) {
  const [draft, setDraft] = useState(filter);
  const [batchOpen, setBatchOpen] = useState(false);

  const activeCount = useMemo(
    () =>
      [
        draft.school,
        draft.authorized !== "all",
        draft.assignStatus !== "all",
        draft.adoptStatus !== "all",
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
            label="期数归属"
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
                选择目标期数（将应用当前草稿筛选条件）：
              </p>
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onBatchAdd(issue.id, draft)}
                  className="flex w-full items-center justify-between border-t border-[#F0F0F0] px-4 py-2.5 transition-colors active:bg-[#FFF0F8]"
                >
                  <span style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>
                    {issue.title}
                  </span>
                  <Check size={13} style={{ color: "#FD80C2", opacity: 0.5 }} />
                </button>
              ))}
            </div>
          ) : null}
        </footer>
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
