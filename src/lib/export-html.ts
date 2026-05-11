export type ExportIssueItem = {
  confirmed: boolean;
  sortOrder: number;
  school: string;
  submitterQuote: string;
  finalComment: string | null;
  images: string[];
};

export type ExportIssue = {
  title: string;
  items: ExportIssueItem[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildIssueHtml(issue: ExportIssue) {
  const items = issue.items
    .filter((item) => item.confirmed)
    .toSorted((a, b) => a.sortOrder - b.sortOrder);

  const body = items
    .map((item, index) => {
      const images = item.images
        .map(
          (src, imageIndex) =>
            `<p><img src="${escapeHtml(src)}" alt="${escapeHtml(item.school)} 投稿图片 ${imageIndex + 1}" /></p>`,
        )
        .join("");

      const comment = item.finalComment ?? item.submitterQuote;

      return [
        `<section data-submission="${index + 1}">`,
        `<h2>${index + 1}. ${escapeHtml(item.school)}</h2>`,
        images,
        `<blockquote>${escapeHtml(item.submitterQuote)}</blockquote>`,
        `<p><strong>编辑吐槽：</strong>${escapeHtml(comment)}</p>`,
        `</section>`,
      ].join("");
    })
    .join("");

  return `<article><h1>${escapeHtml(issue.title)}</h1>${body}</article>`;
}
