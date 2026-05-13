import { describe, expect, it } from "vitest";
import { USER_DATA_CLEANUP_PLAN } from "@/lib/user-data-cleanup";

describe("USER_DATA_CLEANUP_PLAN", () => {
  it("clears only user accounts and editor collaboration traces", () => {
    expect(USER_DATA_CLEANUP_PLAN).toEqual([
      { model: "selection", scope: "all" },
      { model: "reaction", scope: "all" },
      { model: "issueItem", scope: "all" },
      { model: "issue", scope: "all" },
      { model: "comment", scope: "reset selected flags" },
      { model: "comment", scope: "EDITOR only" },
      { model: "user", scope: "all" },
    ]);
  });

  it("documents Feishu-owned data that must survive cleanup", () => {
    const touchedModels = USER_DATA_CLEANUP_PLAN.map((item) => item.model);

    expect(touchedModels).not.toContain("submission");
    expect(touchedModels).not.toContain("submissionImage");
    expect(touchedModels).not.toContain("syncJob");
  });
});
