import { describe, expect, it } from "vitest";
import { selectFinalCommentState } from "@/lib/selection-rules";

describe("selectFinalCommentState", () => {
  it("keeps exactly one selected final comment for a submission", () => {
    const comments = [
      { id: "c1", submissionId: "s1", selected: true },
      { id: "c2", submissionId: "s1", selected: false },
      { id: "c3", submissionId: "s2", selected: true },
    ];

    const next = selectFinalCommentState(comments, "s1", "c2");

    expect(next).toEqual([
      { id: "c1", submissionId: "s1", selected: false },
      { id: "c2", submissionId: "s1", selected: true },
      { id: "c3", submissionId: "s2", selected: true },
    ]);
  });
});
