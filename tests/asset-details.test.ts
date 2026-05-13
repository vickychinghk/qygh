import { describe, expect, it } from "vitest";
import { getAssetIssueDetail } from "@/lib/asset-details";

describe("getAssetIssueDetail", () => {
  it("returns Feishu serial guidance for failed image processing", () => {
    expect(
      getAssetIssueDetail({
        serialNumber: "242",
        assetKind: "UNSUPPORTED",
        processingStatus: "FAILED",
        processingError: "VipsJpeg: Corrupt JPEG data",
      }),
    ).toEqual({
      title: "图片处理失败",
      message: "这张附件暂时无法自动处理。",
      serialLabel: "飞书序号：242",
      errorLabel: "错误信息：VipsJpeg: Corrupt JPEG data",
      actionHint: "可以回到飞书表格按序号定位，下载原文件后在编辑台重新上传。",
    });
  });

  it("returns video-specific guidance for unsupported video attachments", () => {
    expect(
      getAssetIssueDetail({
        serialNumber: "101",
        assetKind: "VIDEO",
        processingStatus: "UNSUPPORTED",
        processingError: "暂不支持视频",
      }),
    ).toEqual({
      title: "暂不支持视频",
      message: "这个附件是视频，当前编辑台只自动处理图片。",
      serialLabel: "飞书序号：101",
      errorLabel: "错误信息：暂不支持视频",
      actionHint: "可以回到飞书表格按序号定位，下载原文件后在编辑台重新上传。",
    });
  });
});
