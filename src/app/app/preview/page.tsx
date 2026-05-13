import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { getPreviewIssue } from "@/lib/data";
import { requireCurrentUser } from "@/lib/auth";
import { buildIssueHtml } from "@/lib/export-html";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ issue?: string }>;
}) {
  await requireCurrentUser();
  const params = await searchParams;
  const issue = params?.issue ? await getPreviewIssue(params.issue) : null;
  const adopted =
    issue?.items
      .filter((item) => item.confirmed)
      .toSorted((a, b) => a.sortOrder - b.sortOrder) ?? [];
  const richContent = issue ? buildIssueHtml(issue) : "";
  const previewTitle = issue
    ? formatPreviewTitle(issue.title)
    : "清北迷惑行为大赏 • 2024年10月刊";

  return (
    <main
      className="relative mx-auto flex max-w-[740px] flex-col bg-white"
      style={{ height: "100dvh" }}
    >
      <div
        className="flex flex-shrink-0 items-center gap-3 border-b border-[#F0F0F0] bg-white px-4"
        style={{ height: 56 }}
      >
        <Link
          href={params?.issue ? `/app?issue=${params.issue}` : "/app"}
          className="flex size-8 items-center justify-center rounded-full transition-colors active:bg-[#F5F5F5]"
        >
          <ArrowLeft size={18} className="text-[#333]" />
        </Link>
        <div className="flex-1">
          <p style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
            文章预览
          </p>
          {issue ? (
            <p style={{ fontSize: 11, color: "#AAA" }}>
              {issue.title} · {adopted.length} 条已采用
            </p>
          ) : null}
        </div>
        {params?.issue ? (
          <a
            href={`/api/export/${params.issue}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "#FFF0F8", color: "#FD80C2", fontSize: 11 }}
          >
            <ExternalLink size={13} />
            导出
          </a>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {!issue || adopted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <AlertCircle size={32} style={{ color: "#FD80C2", opacity: 0.5 }} />
            <p style={{ fontSize: 15, color: "#AAA", fontWeight: 500 }}>
              当前期数没有已采用的投稿
            </p>
            <p style={{ fontSize: 12, color: "#CCC" }}>
              请先在期数中勾选采用投稿
            </p>
          </div>
        ) : (
          <>
            <article
              id="js_article"
              className="rich_media mx-auto"
              style={{ maxWidth: 677, color: "#3f3f3f" }}
            >
              <div className="rich_media_inner">
                <div className="rich_media_area_primary">
                  <div className="rich_media_area_primary_inner px-5 pb-8 pt-7 sm:px-8">
                    <header id="img-content" className="rich_media_wrp">
                      <h1
                        className="rich_media_title"
                        id="activity-name"
                        style={{
                          margin: "0 0 12px",
                          fontSize: 22,
                          fontWeight: 400,
                          lineHeight: 1.4,
                          color: "#111",
                          wordBreak: "break-word",
                        }}
                      >
                        <span className="js_title_inner">{previewTitle}</span>
                      </h1>
                      <div
                        className="rich_media_meta_list"
                        id="meta_content"
                        style={{
                          marginBottom: 22,
                          lineHeight: 1.6,
                          color: "#8c8c8c",
                        }}
                      >
                        <div
                          className="flex flex-wrap items-center gap-x-3 gap-y-1"
                          style={{ fontSize: 15 }}
                        >
                          <span
                            className="rich_media_meta icon_appmsg_tag appmsg_title_tag"
                            id="copyright_logo"
                            style={{
                              display: "inline-block",
                              padding: "0 3px",
                              border: "1px solid #d8d8d8",
                              borderRadius: 2,
                              color: "#8c8c8c",
                              fontSize: 12,
                              lineHeight: "17px",
                              verticalAlign: "middle",
                            }}
                          >
                            原创
                          </span>
                          <span className="rich_media_meta rich_media_meta_text">
                            清北迷惑行为大赏
                          </span>
                          <span
                            className="rich_media_meta rich_media_meta_nickname"
                            id="profileBt"
                          >
                            <span id="js_name" style={{ color: "#576b95" }}>
                              全元光滑
                            </span>
                          </span>
                        </div>
                        <div
                          id="meta_content_hide_info"
                          style={{ marginTop: 1, fontSize: 15 }}
                        >
                          <em
                            className="rich_media_meta rich_media_meta_text"
                            id="publish_time"
                            style={{ fontStyle: "normal" }}
                          >
                            2024年11月4日 08:18
                          </em>
                          <em
                            className="rich_media_meta rich_media_meta_text"
                            id="js_ip_wording_wrp"
                            aria-label="荷兰"
                            style={{ marginLeft: 8, fontStyle: "normal" }}
                          >
                            <span id="js_ip_wording">荷兰</span>
                          </em>
                        </div>
                      </div>
                    </header>

                    <div
                      className="rich_media_content js_underline_content defaultNoSetting fix_apple_default_style"
                      id="js_content"
                      dangerouslySetInnerHTML={{ __html: richContent }}
                    />
                  </div>
                </div>
              </div>
            </article>
            <div
              className="sticky bottom-0 z-10 mx-auto bg-white"
              style={{ maxWidth: 677 }}
            >
              <Image
                src="/preview-assets/bottom.png"
                alt="公众号底部互动栏预览"
                width={1080}
                height={160}
                className="h-auto w-full"
                priority
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function formatPreviewTitle(title: string) {
  const raw = title.trim();
  const withoutPrefix = raw.replace(/^清北迷惑行为大赏\s*[•·\-—]?\s*/, "");
  const withoutIssue = withoutPrefix.replace(/期$/, "");
  const withSuffix = withoutIssue.endsWith("刊")
    ? withoutIssue
    : `${withoutIssue}刊`;

  return `清北迷惑行为大赏 • ${withSuffix}`;
}
