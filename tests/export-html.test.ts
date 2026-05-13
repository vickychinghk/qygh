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

  it("renders the default header and footer image blocks around the issue body", () => {
    const html = buildIssueHtml({
      title: "测试篇",
      items: [
        {
          confirmed: true,
          sortOrder: 1,
          school: "北京大学",
          submitterQuote: "正文第一条",
          finalComment: null,
          images: [{ src: "/uploads/a.webp", width: 1000, height: 500 }],
        },
      ],
    });

    expect(html).toContain('data-src="/export-assets/top.webp"');
    expect(html).toContain('data-ratio="0.425531914893617"');
    expect(html).toContain('data-w="940"');
    expect(html.indexOf("/export-assets/top.webp")).toBeLessThan(
      html.indexOf("本期共收录迷惑行为"),
    );
    expect(html).toContain("/export-assets/footer-1.png");
    expect(html).toContain("/export-assets/footer-2.png");
    expect(html).toContain("/export-assets/footer-3.png");
    expect(html.match(/欢迎投稿/g)).toHaveLength(3);
    expect(html.indexOf("正文第一条")).toBeLessThan(
      html.indexOf("/export-assets/footer-1.png"),
    );
  });

  it("uses explicit numeric order as the displayed number and supports decimal sorting", () => {
    const html = buildIssueHtml({
      title: "测试篇",
      items: [
        {
          confirmed: true,
          sortOrder: 36.5,
          school: "北京大学",
          submitterQuote: "半路插队",
          finalComment: null,
          images: [],
        },
        {
          confirmed: true,
          sortOrder: -1,
          school: "清华大学",
          submitterQuote: "序章",
          finalComment: null,
          images: [],
        },
        {
          confirmed: true,
          sortOrder: 37,
          school: "清+北（TP-LINK）",
          submitterQuote: "下一条",
          finalComment: null,
          images: [],
        },
      ],
    });

    expect(html.indexOf("No.-1")).toBeLessThan(html.indexOf("No.36.5"));
    expect(html.indexOf("No.36.5")).toBeLessThan(html.indexOf("No.37"));
    expect(html).toContain("rgb(124, 46, 154)");
    expect(html).toContain("rgb(167, 42, 42)");
    expect(html).toContain(
      "linear-gradient(to right, rgb(192, 0, 0) 0%, rgb(112, 48, 160) 80%)",
    );
  });

  it("renders multiline comments inside one item before its image group", () => {
    const html = buildIssueHtml({
      title: "测试篇",
      items: [
        {
          confirmed: true,
          sortOrder: 1,
          school: "北京大学",
          submitterQuote: "第一行\n第二行",
          finalComment: null,
          images: [{ src: "/uploads/a.webp", width: 1080, height: 720 }],
        },
      ],
    });

    expect(html.indexOf("第一行")).toBeLessThan(html.indexOf("第二行"));
    expect(html.indexOf("第二行")).toBeLessThan(html.indexOf('data-src="/uploads/a.webp"'));
  });

  it("allows per-item source note overrides", () => {
    const html = buildIssueHtml({
      title: "测试篇",
      items: [
        {
          confirmed: true,
          sortOrder: 1,
          school: "复旦大学",
          submitterQuote: "友校投稿",
          finalComment: null,
          sourceNote: "来自友校复旦大学",
          images: [],
        },
      ],
    });

    expect(html).toContain("来自友校复旦大学");
    expect(html).not.toContain("来自粉丝投稿");
  });

  it("chooses image display width from image ratio", () => {
    const html = buildIssueHtml({
      title: "测试篇",
      items: [
        {
          confirmed: true,
          sortOrder: 1,
          school: "北京大学",
          submitterQuote: "图片宽度测试",
          finalComment: null,
          images: [
            { src: "/uploads/wide.webp", width: 1000, height: 100 },
            { src: "/uploads/default.webp", width: 1000, height: 750 },
            { src: "/uploads/tall.webp", width: 1000, height: 1700 },
            { src: "/uploads/very-tall.webp", width: 1000, height: 2700 },
          ],
        },
      ],
    });

    expect(html).toContain('width: 90%;height: auto;box-shadow');
    expect(html).toContain('width: 80%;height: auto;box-shadow');
    expect(html).toContain('width: 60%;height: auto;box-shadow');
    expect(html).toContain('width: 30%;height: auto;box-shadow');
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
