export type AssetIssueInput = {
  serialNumber?: string | null;
  assetKind?: string | null;
  processingStatus?: string | null;
  processingError?: string | null;
};

export type AssetIssueDetail = {
  title: string;
  message: string;
  serialLabel: string;
  errorLabel: string;
  actionHint: string;
};

export function getAssetIssueDetail(input: AssetIssueInput): AssetIssueDetail {
  const title = input.assetKind === "VIDEO" ? "暂不支持视频" : "图片处理失败";
  const message =
    input.assetKind === "VIDEO"
      ? "这个附件是视频，当前编辑台只自动处理图片。"
      : "这张附件暂时无法自动处理。";
  const serial = input.serialNumber?.trim() || "未记录";
  const error =
    input.processingError?.trim() ||
    (input.processingStatus ? `状态：${input.processingStatus}` : "未记录");

  return {
    title,
    message,
    serialLabel: `飞书序号：${serial}`,
    errorLabel: `错误信息：${error}`,
    actionHint: "可以回到飞书表格按序号定位，下载原文件后在编辑台重新上传。",
  };
}
