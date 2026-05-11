import { describe, expect, it } from "vitest";
import { buildIssueHtml } from "@/lib/export-html";

describe("buildIssueHtml", () => {
  it("exports confirmed issue items in sort order only", () => {
    const html = buildIssueHtml({
      title: "2026 年 5 月第 1 篇",
      items: [
        {
          confirmed: true,
          sortOrder: 2,
          school: "南山大学",
          submitterQuote: "楼梯口这个标语也太离谱了",
          finalComment: "这条适合放第二段。",
          images: ["/uploads/a.webp"],
        },
        {
          confirmed: false,
          sortOrder: 1,
          school: "北城学院",
          submitterQuote: "未确认不该导出",
          finalComment: "不该出现",
          images: ["/uploads/b.webp"],
        },
        {
          confirmed: true,
          sortOrder: 1,
          school: "东湖中学",
          submitterQuote: "这个通知看三遍都没懂",
          finalComment: "先来一条最抓人的。",
          images: ["/uploads/c.webp"],
        },
      ],
    });

    expect(html).toContain("2026 年 5 月第 1 篇");
    expect(html.indexOf("东湖中学")).toBeLessThan(html.indexOf("南山大学"));
    expect(html).toContain("先来一条最抓人的。");
    expect(html).not.toContain("未确认不该导出");
  });

  it("uses an empty comment fallback when no final comment is selected", () => {
    const html = buildIssueHtml({
      title: "测试篇",
      items: [
        {
          confirmed: true,
          sortOrder: 1,
          school: "东湖中学",
          submitterQuote: "原投稿吐槽",
          finalComment: null,
          images: [],
        },
      ],
    });

    expect(html).toContain("原投稿吐槽");
    expect(html).toContain("东湖中学");
  });
});
