import { getSchoolTheme } from "@/lib/school-theme";

export type ExportIssueItem = {
  confirmed: boolean;
  sortOrder: number;
  school: string;
  consentGranted?: boolean;
  submitterQuote: string;
  finalComment: string | null;
  sourceNote?: string | null;
  images: ExportImage[];
};

export type ExportIssue = {
  title: string;
  items: ExportIssueItem[];
};

const DEFAULT_HEADER_IMAGE = {
  src: "/export-assets/top.webp",
  width: 940,
  height: 400,
};

const DEFAULT_FOOTER_IMAGES = [
  {
    src: "/export-assets/footer-1.png",
    width: 1000,
    height: 500,
  },
  {
    src: "/export-assets/footer-2.png",
    width: 1000,
    height: 500,
  },
  {
    src: "/export-assets/footer-3.png",
    width: 1000,
    height: 500,
  },
];

export type ExportImage =
  | string
  | {
      src: string;
      width?: number | null;
      height?: number | null;
    };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeImage(image: ExportImage) {
  return typeof image === "string"
    ? { src: image, width: null, height: null }
    : image;
}

function formatRatio(image: ReturnType<typeof normalizeImage>) {
  if (!image.width || !image.height || image.width <= 0 || image.height <= 0) {
    return "1";
  }

  return String(image.height / image.width);
}

function imageDisplayWidth(image: ReturnType<typeof normalizeImage>) {
  const ratio = Number(formatRatio(image));

  if (ratio < 0.25) {
    return "90%";
  }
  if (ratio >= 2.5) {
    return "30%";
  }
  if (ratio >= 1.5) {
    return "60%";
  }
  if (ratio >= 1.2) {
    return "70%";
  }
  return "80%";
}

function numberBadge(index: number, school: string) {
  const theme = getSchoolTheme(school);
  const outerBackground = theme.exportBadge.background;
  const right = theme.exportBadge.direction === "right";
  const transform = right ? "translate3d(2px, 0px, 0px)" : "translate3d(-2px, 0px, 0px)";
  const innerTransform = right ? "translate3d(-5px, 0px, 0px)" : "translate3d(5px, 0px, 0px)";
  const backgroundStyle = outerBackground.startsWith("linear-gradient")
    ? `background-image: ${outerBackground};`
    : `background-color: ${outerBackground};`;

  return `<section style="max-width: 100%;box-sizing: border-box;"><section style="text-align: center;justify-content: center;display: flex;flex-flow: row;transform: ${transform};-webkit-transform: ${transform};-moz-transform: ${transform};-o-transform: ${transform};margin: 10px 0%;max-width: 100%;box-sizing: border-box;"><section style="display: inline-block;width: auto;vertical-align: top;align-self: flex-start;flex: 0 1 auto;min-width: 10%;${backgroundStyle}max-width: 100%;box-sizing: border-box;"><section style="justify-content: center;display: flex;flex-flow: row;margin: 5px 0% -5px;transform: ${innerTransform};-webkit-transform: ${innerTransform};-moz-transform: ${innerTransform};-o-transform: ${innerTransform};max-width: 100%;box-sizing: border-box;"><section style="display: inline-block;width: auto;vertical-align: top;align-self: flex-start;flex: 0 1 auto;min-width: 10%;border-style: solid;border-width: 8px 1px 1px;border-color: rgb(62, 62, 62);background-color: rgb(255, 255, 255);padding-right: 8px;padding-left: 8px;box-shadow: rgb(0, 0, 0) 0px 0px 0px;max-width: 100%;box-sizing: border-box;"><section style="max-width: 100%;box-sizing: border-box;"><section style="padding-right: 8px;padding-left: 8px;max-width: 100%;box-sizing: border-box;"><p style="margin: 0px;padding: 0px;box-sizing: border-box;"><em style="box-sizing: border-box;"><strong style="box-sizing: border-box;">No.${index}</strong></em></p></section></section></section></section></section></section></section>`;
}

function formatIssueNumber(sortOrder: number) {
  return Number.isInteger(sortOrder) ? String(sortOrder) : String(sortOrder);
}

function renderComment(comment: string) {
  const lines = comment
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const paragraphs = (lines.length > 0 ? lines : [""])
    .map((line) => `<p style="margin: 0px;padding: 0px;box-sizing: border-box;">${escapeHtml(line)}</p>`)
    .join("");

  return `<section style="text-align: center;box-sizing: border-box;"><p style="margin: 0px;padding: 0px;box-sizing: border-box;"><br style="box-sizing: border-box;"></p>${paragraphs}</section>`;
}

function renderImage(
  image: ExportImage,
  index: number,
  alt: string,
  options?: { displayWidth?: string; shadow?: boolean },
) {
  const normalized = normalizeImage(image);
  const src = escapeHtml(normalized.src);
  const ratio = escapeHtml(formatRatio(normalized));
  const width = normalized.width ? String(normalized.width) : "1000";
  const displayWidth = options?.displayWidth ?? imageDisplayWidth(normalized);
  const shadow = options?.shadow === false ? "" : "box-shadow: rgb(160, 160, 160) 1px 1px 3px 0px;";

  return `<section style="text-align: center;margin-top: 10px;margin-bottom: 10px;line-height: 0;box-sizing: border-box;"><section style="max-width: 100%;vertical-align: middle;display: inline-block;line-height: 0;width: ${displayWidth};height: auto;${shadow}box-sizing: border-box;"><img class="rich_pages wxw-img" data-ratio="${ratio}" data-s="300,640" data-src="${src}" data-w="${escapeHtml(width)}" style="vertical-align: middle;max-width: 100%;width: 100%;box-sizing: border-box;height: auto;" width="100%" data-original-style="vertical-align: middle;max-width: 100%;width: 100%;box-sizing: border-box;" data-index="${index}" src="${src}" alt="${escapeHtml(alt)}" /></section></section>`;
}

function introSection(count: number) {
  const minutes = Math.max(1, Math.ceil(count * 0.15));

  return `<section style="box-sizing: border-box; visibility: visible;"><p style="text-align: center; white-space: normal; margin: 0px; padding: 0px; box-sizing: border-box; visibility: visible;"><br style="box-sizing: border-box; visibility: visible;"></p><p style="text-align: center; white-space: normal; margin: 0px; padding: 0px; box-sizing: border-box; visibility: visible;"><span style="font-family: PingFangSC-light; box-sizing: border-box; visibility: visible;">本期共收录迷惑行为<strong style="box-sizing: border-box; visibility: visible;"><span style="color: rgb(255, 101, 175); box-sizing: border-box; visibility: visible;">${count}条</span></strong></span></p><p style="text-align: center; white-space: normal; margin: 0px; padding: 0px; box-sizing: border-box; visibility: visible;"><span style="font-family: PingFangSC-light; box-sizing: border-box; visibility: visible;">预计哈哈哈时间为<strong style="box-sizing: border-box; visibility: visible;"><span style="font-family: PingFangSC-light; color: rgb(255, 101, 175); box-sizing: border-box; visibility: visible;">${minutes}分钟</span></strong></span></p><p style="white-space: normal; margin: 0px; padding: 0px; box-sizing: border-box; visibility: visible;"><br style="box-sizing: border-box; visibility: visible;"></p></section>`;
}

function footerSection(startImageIndex: number) {
  const welcome = `<section style="max-width: 100%;box-sizing: border-box;"><section style="text-align: unset;font-size: 11px;color: rgb(160, 160, 160);letter-spacing: 1px;max-width: 100%;box-sizing: border-box;"><p style="text-align: center;margin: 0px;padding: 0px;box-sizing: border-box;"><br style="box-sizing: border-box;"></p><p style="text-align: center;margin: 0px;padding: 0px;box-sizing: border-box;"><strong style="box-sizing: border-box;"><span style="font-size: 13px;color: rgb(255, 101, 175);box-sizing: border-box;">欢迎投稿</span></strong></p><p style="text-align: center;margin: 0px;padding: 0px;box-sizing: border-box;"><strong style="box-sizing: border-box;"><span style="font-size: 13px;color: rgb(255, 101, 175);box-sizing: border-box;">欢迎投稿</span></strong></p><p style="text-align: center;margin: 0px;padding: 0px;box-sizing: border-box;"><strong style="box-sizing: border-box;"><span style="font-size: 13px;color: rgb(255, 101, 175);box-sizing: border-box;">欢迎投稿</span></strong></p></section></section>`;
  const images = DEFAULT_FOOTER_IMAGES.map((image, offset) =>
    renderImage(image, startImageIndex + offset, `文末固定图 ${offset + 1}`, {
      displayWidth: "100%",
      shadow: false,
    }),
  ).join("");

  return `${welcome}<p style="white-space: normal;margin: 0px;padding: 0px;box-sizing: border-box;"><br style="box-sizing: border-box;"></p>${images}`;
}

export function buildIssueHtml(issue: ExportIssue) {
  const items = issue.items
    .filter((item) => item.confirmed)
    .toSorted((a, b) => a.sortOrder - b.sortOrder);

  let imageIndex = 1;
  const header = renderImage(DEFAULT_HEADER_IMAGE, imageIndex++, "文章顶部固定图", {
    displayWidth: "100%",
    shadow: false,
  });
  const body = items
    .map((item) => {
      const comment = item.finalComment ?? item.submitterQuote;
      const sourceNote = item.sourceNote?.trim() || "来自粉丝投稿";
      const images = item.images
        .map((image) =>
          renderImage(image, imageIndex++, `${item.school} 投稿图片 ${imageIndex - 1}`),
        )
        .join("");

      return [
        numberBadge(Number(formatIssueNumber(item.sortOrder)), item.school),
        renderComment(comment),
        images,
        `<section style="max-width: 100%;box-sizing: border-box;"><section style="text-align: unset;font-size: 11px;color: rgb(160, 160, 160);letter-spacing: 1px;max-width: 100%;box-sizing: border-box;"><p style="text-align: center;margin: 0px;padding: 0px;box-sizing: border-box;">${escapeHtml(sourceNote)}</p></section></section>`,
        `<p style="white-space: normal;margin: 0px;padding: 0px;box-sizing: border-box;"><br style="box-sizing: border-box;"></p>`,
      ].join("");
    })
    .join("");
  const footer = footerSection(imageIndex);

  return `<section style="box-sizing: border-box; font-style: normal; font-weight: 400; text-align: justify; font-size: 16px; color: rgb(62, 62, 62); visibility: visible;">${header}${introSection(items.length)}${body}${footer}</section>`;
}
