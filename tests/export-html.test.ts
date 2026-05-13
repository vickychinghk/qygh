import { describe, expect, it } from "vitest";
import { buildIssueHtml } from "@/lib/export-html";

describe("buildIssueHtml", () => {
  it("exports a clean WeChat rich content section in sort order only", () => {
    const html = buildIssueHtml({
      title: "2026 年 5 月第 1 篇",
      items: [
        {
          confirmed: true,
          sortOrder: 2,
          school: "南山大学",
          submitterQuote: "楼梯口这个标语也太离谱了",
          finalComment: "这条适合放第二段。",
          images: [{ src: "/uploads/a.webp", width: 1080, height: 720 }],
        },
        {
          confirmed: false,
          sortOrder: 1,
          school: "北城学院",
          submitterQuote: "未确认不该导出",
          finalComment: "不该出现",
          images: [{ src: "/uploads/b.webp", width: 1080, height: 720 }],
        },
        {
          confirmed: true,
          sortOrder: 1,
          school: "东湖中学",
          submitterQuote: "这个通知看三遍都没懂",
          finalComment: "先来一条最抓人的。",
          images: [{ src: "/uploads/c.webp", width: 1000, height: 500 }],
        },
      ],
    });

    expect(html.startsWith("<section ")).toBe(true);
    expect(html.endsWith("</section>")).toBe(true);
    expect(html).not.toContain("<article");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<blockquote");
    expect(html).toContain("本期共收录迷惑行为");
    expect(html).toContain("2条");
    expect(html).toContain("No.1");
    expect(html).toContain("No.2");
    expect(html.indexOf("东湖中学")).toBeLessThan(html.indexOf("南山大学"));
    expect(html).toContain("先来一条最抓人的。");
    expect(html).toContain("来自粉丝投稿");
    expect(html).not.toContain("来自东湖中学投稿");
    expect(html).toContain('data-ratio="0.5"');
    expect(html).toContain('data-w="1000"');
    expect(html).toContain('data-src="/uploads/c.webp"');
    expect(html).toContain('src="/uploads/c.webp"');
    expect(html).not.toContain("未确认不该导出");
  });

  it("uses the submitter quote when no final comment is selected", () => {
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
    expect(html).toContain("来自粉丝投稿");
  });
});
