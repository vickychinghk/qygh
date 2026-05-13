import { describe, expect, it } from "vitest";
import {
  applySubmissionFilter,
  canDeleteComment,
  filterDisplayableImages,
  formatDefaultIssueTitle,
  getUniqueIssueTitle,
  hasUserReacted,
  isWebDisplayableImage,
  moveIssueItemInDirection,
  getSubmissionIssueLabel,
  parseIssueSortOrderInput,
  SCHOOL_OPTIONS,
  reorderIssueItemsToPosition,
  selectFinalCommentState,
  sortImagesForEditing,
  sortSubmissionsBySerialDesc,
} from "@/lib/selection-rules";

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

describe("filterDisplayableImages", () => {
  it("keeps displayable images even when the local cache file is missing", () => {
    const images = [
      { id: "cached", localPath: "/uploads/feishu/cached.jpg" },
      { id: "missing", localPath: "/uploads/feishu/missing.jpg" },
    ];

    expect(
      filterDisplayableImages(images, () => false),
    ).toEqual(images);
  });

  it("removes cached attachments that browsers cannot display as images", () => {
    const images = [
      { id: "jpg", localPath: "/uploads/feishu/a.jpg" },
      { id: "heic", localPath: "/uploads/feishu/a.HEIC" },
      { id: "video", localPath: "/uploads/feishu/a.mp4" },
    ];

    expect(filterDisplayableImages(images, () => true)).toEqual([
      { id: "jpg", localPath: "/uploads/feishu/a.jpg" },
    ]);
  });

  it("keeps unsupported video assets so the editor can show a placeholder", () => {
    const images = [
      {
        id: "video",
        localPath: "/uploads/originals/feishu/a.mov",
        assetKind: "VIDEO",
        processingStatus: "UNSUPPORTED",
      },
      {
        id: "failed",
        localPath: "/uploads/originals/feishu/a.dng",
        assetKind: "UNSUPPORTED",
        processingStatus: "FAILED",
      },
    ];

    expect(filterDisplayableImages(images, () => true)).toEqual(images);
  });
});

describe("sortImagesForEditing", () => {
  it("places enabled images first and then orders by update time", () => {
    const images = [
      { id: "disabled-new", enabled: false, updatedAt: new Date("2026-05-12T12:00:00+08:00") },
      { id: "enabled-new", enabled: true, updatedAt: new Date("2026-05-12T11:00:00+08:00") },
      { id: "enabled-old", enabled: true, updatedAt: new Date("2026-05-12T10:00:00+08:00") },
      { id: "disabled-old", enabled: false, updatedAt: new Date("2026-05-12T09:00:00+08:00") },
    ];

    expect(sortImagesForEditing(images).map((image) => image.id)).toEqual([
      "enabled-old",
      "enabled-new",
      "disabled-old",
      "disabled-new",
    ]);
  });
});

describe("isWebDisplayableImage", () => {
  it("allows common browser image extensions", () => {
    expect(isWebDisplayableImage("/a.JPG")).toBe(true);
    expect(isWebDisplayableImage("/a.png")).toBe(true);
    expect(isWebDisplayableImage("/a.webp")).toBe(true);
  });

  it("blocks raw images and videos", () => {
    expect(isWebDisplayableImage("/a.heic")).toBe(false);
    expect(isWebDisplayableImage("/a.dng")).toBe(false);
    expect(isWebDisplayableImage("/a.mp4")).toBe(false);
  });
});

describe("formatDefaultIssueTitle", () => {
  it("uses the creation month as the default editable publication name", () => {
    expect(formatDefaultIssueTitle(new Date("2026-05-12T09:30:00+08:00"))).toBe(
      "2026年5月刊",
    );
  });
});

describe("getUniqueIssueTitle", () => {
  it("keeps a title when no existing publication uses it", () => {
    expect(getUniqueIssueTitle("2026年5月刊", ["2026年4月刊"])).toBe("2026年5月刊");
  });

  it("adds the next underscore suffix when publication names repeat", () => {
    expect(
      getUniqueIssueTitle("2026年5月刊", [
        "2026年5月刊",
        "2026年5月刊_1",
        "2026年5月刊_2",
      ]),
    ).toBe("2026年5月刊_3");
  });
});

describe("sortSubmissionsBySerialDesc", () => {
  it("orders the library by Feishu serial number descending", () => {
    const submissions = [
      { id: "a", serialNumber: "9" },
      { id: "b", serialNumber: "12" },
      { id: "c", serialNumber: "001" },
    ];

    expect(sortSubmissionsBySerialDesc(submissions).map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

describe("getSubmissionIssueLabel", () => {
  it("shows the single issue a submission belongs to", () => {
    expect(
      getSubmissionIssueLabel([
        { issue: { title: "2026年5月刊" } },
      ]),
    ).toBe("已加入 2026年5月刊");
  });

  it("shows an unassigned label when a submission belongs to no issue", () => {
    expect(getSubmissionIssueLabel([])).toBe("未分配任何刊数");
  });
});

describe("SCHOOL_OPTIONS", () => {
  it("offers the expanded school field choices used by cards and filters", () => {
    expect(SCHOOL_OPTIONS).toEqual([
      "北京大学",
      "清华大学",
      "清+北（TP-LINK）",
      "复旦大学",
      "上海交大",
      "中国人民大学",
      "其他",
    ]);
  });
});

describe("hasUserReacted", () => {
  it("only marks the heart active when the current user has reacted", () => {
    expect(
      hasUserReacted(
        [
          { userId: "u2" },
          { userId: "u3" },
        ],
        "u1",
      ),
    ).toBe(false);

    expect(
      hasUserReacted(
        [
          { userId: "u2" },
          { userId: "u1" },
        ],
        "u1",
      ),
    ).toBe(true);
  });
});

describe("applySubmissionFilter", () => {
  const submissions = [
    {
      id: "a",
      school: "北京大学",
      consentGranted: true,
      submittedAt: new Date("2026-05-10T12:00:00+08:00"),
      issueItems: [{ issueId: "i1", confirmed: true }],
      serialNumber: "3",
    },
    {
      id: "b",
      school: "清华大学",
      consentGranted: false,
      submittedAt: new Date("2026-05-11T12:00:00+08:00"),
      issueItems: [],
      serialNumber: "2",
    },
  ];

  it("filters by school, authorization, assignment, adoption, date, and serial range", () => {
    expect(
      applySubmissionFilter(submissions, {
        school: "北京",
        authorized: "yes",
        assignStatus: "assigned",
        adoptStatus: "adopted",
        dateFrom: "2026-05-10",
        dateTo: "2026-05-10",
        serialFrom: "3",
        serialTo: "3",
      }).map((submission) => submission.id),
    ).toEqual(["a"]);
  });
});

describe("reorderIssueItemsToPosition", () => {
  it("moves one issue item to a one-based target position and renormalizes order from 1", () => {
    const next = reorderIssueItemsToPosition(
      [
        { id: "a", sortOrder: 1 },
        { id: "b", sortOrder: 2 },
        { id: "c", sortOrder: 3 },
      ],
      "c",
      1,
    );

    expect(next).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "a", sortOrder: 2 },
      { id: "b", sortOrder: 3 },
    ]);
  });

  it("allows zero and negative starting numbers while keeping a complete integer sequence", () => {
    expect(
      reorderIssueItemsToPosition(
        [
          { id: "a", sortOrder: 1 },
          { id: "b", sortOrder: 2 },
          { id: "c", sortOrder: 3 },
        ],
        "c",
        0,
      ),
    ).toEqual([
      { id: "c", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);

    expect(
      reorderIssueItemsToPosition(
        [
          { id: "a", sortOrder: 1 },
          { id: "b", sortOrder: 2 },
          { id: "c", sortOrder: 3 },
        ],
        "b",
        -1,
      ),
    ).toEqual([
      { id: "b", sortOrder: -1 },
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
    ]);
  });
});

describe("moveIssueItemInDirection", () => {
  it("moves an item up or down and renormalizes the full publication order", () => {
    expect(
      moveIssueItemInDirection(
        [
          { id: "a", sortOrder: 0 },
          { id: "b", sortOrder: 2 },
          { id: "c", sortOrder: 5 },
        ],
        "c",
        "up",
      ),
    ).toEqual([
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });
});

describe("parseIssueSortOrderInput", () => {
  it("accepts negative, zero, and integer publication numbers", () => {
    expect(parseIssueSortOrderInput("-2")).toBe(-2);
    expect(parseIssueSortOrderInput("0")).toBe(0);
    expect(parseIssueSortOrderInput(" 37 ")).toBe(37);
  });

  it("rejects empty, decimal, and non-numeric publication numbers", () => {
    expect(parseIssueSortOrderInput("")).toBeNull();
    expect(parseIssueSortOrderInput("36.5")).toBeNull();
    expect(parseIssueSortOrderInput("abc")).toBeNull();
    expect(parseIssueSortOrderInput("36abc")).toBeNull();
  });
});

describe("canDeleteComment", () => {
  it("only allows editors to delete their own unselected editor comments", () => {
    expect(
      canDeleteComment("u1", {
        authorId: "u1",
        selected: false,
        source: "EDITOR",
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks deleting submitter comments", () => {
    expect(
      canDeleteComment("u1", {
        authorId: null,
        selected: false,
        source: "SUBMITTER",
      }),
    ).toEqual({ allowed: false, reason: "投稿人吐槽语不能删除" });
  });

  it("prompts instead of deleting a selected final comment", () => {
    expect(
      canDeleteComment("u1", {
        authorId: "u1",
        selected: true,
        source: "EDITOR",
      }),
    ).toEqual({ allowed: false, reason: "已采用，需先取消采用" });
  });
});
