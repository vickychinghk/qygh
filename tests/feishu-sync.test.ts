import { describe, expect, it } from "vitest";
import {
  buildBitableSearchRequest,
  DEFAULT_FEISHU_FIELD_MAPPING,
  filterNewFeishuRecords,
  mapFeishuRecordToSubmission,
  parseBitableUrl,
  summarizeImageCacheResults,
} from "@/lib/feishu-sync";

describe("parseBitableUrl", () => {
  it("extracts app token, table id, and view id from a Feishu Bitable URL", () => {
    expect(
      parseBitableUrl(
        "https://my.feishu.cn/base/FxKSblzJWaUgdmsEY8xcr5uJnie?table=tbl3wGPxgmuvWHwB&view=vewNhBX7cO",
      ),
    ).toEqual({
      appToken: "FxKSblzJWaUgdmsEY8xcr5uJnie",
      tableId: "tbl3wGPxgmuvWHwB",
      viewId: "vewNhBX7cO",
    });
  });
});

describe("mapFeishuRecordToSubmission", () => {
  it("normalizes Feishu Bitable fields into local submission data", () => {
    const result = mapFeishuRecordToSubmission(
      {
        record_id: "recFAbnt8S",
        fields: {
          "编号": "1",
          "提交时间": 1778509399000,
          "投稿日期": 1696482000000,
          "请问此条迷惑行为发生于哪所学校？": "其他",
          "请问此条迷惑行为发生于哪所学校？-其他-补充内容": [
            { text: "不知道哈", type: "text" },
          ],
          "请上传您的投稿内容：": [
            {
              file_token: "WYLVbqIfxoS9JrxhHK4c1TygnEd",
              name: "sample.jpg",
              size: 487885,
              tmp_url:
                "https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url?file_tokens=WYLVbqIfxoS9JrxhHK4c1TygnEd",
              type: "image/jpeg",
              url: "https://open.feishu.cn/open-apis/drive/v1/medias/WYLVbqIfxoS9JrxhHK4c1TygnEd/download",
            },
          ],
          "感谢投稿，现在请您吐槽：": [
            { text: "哈哈哈哈哈哈", type: "text" },
          ],
          "投稿时，是否已经征得当事人许可？": "不涉及",
        },
      },
      DEFAULT_FEISHU_FIELD_MAPPING,
    );

    expect(result.submission).toEqual({
      feishuRecordId: "recFAbnt8S",
      serialNumber: "1",
      school: "其他：不知道哈",
      submitterQuote: "哈哈哈哈哈哈",
      consentGranted: true,
      submittedAt: new Date(1696482000000),
      status: "READY",
    });
    expect(result.images).toEqual([
      {
        remoteUrl:
          "https://open.feishu.cn/open-apis/drive/v1/medias/WYLVbqIfxoS9JrxhHK4c1TygnEd/download",
        tmpUrl:
          "https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url?file_tokens=WYLVbqIfxoS9JrxhHK4c1TygnEd",
        fileToken: "WYLVbqIfxoS9JrxhHK4c1TygnEd",
        fileName: "sample.jpg",
        remoteMimeType: "image/jpeg",
        bytes: 487885,
        sortOrder: 0,
      },
    ]);
  });
});

describe("buildBitableSearchRequest", () => {
  it("builds an initial request with sort but no incremental filter", () => {
    expect(
      buildBitableSearchRequest({
        fieldMapping: DEFAULT_FEISHU_FIELD_MAPPING,
        pageSize: 500,
        viewId: "vew123",
      }),
    ).toEqual({
      query: { page_size: "500" },
      body: {
        view_id: "vew123",
        sort: [{ field_name: "投稿日期", desc: false }],
      },
    });
  });

  it("builds an incremental request from the previous submitted-at cursor", () => {
    expect(
      buildBitableSearchRequest({
        cursorSubmittedAt: new Date("2026-05-12T10:00:00.000Z"),
        fieldMapping: DEFAULT_FEISHU_FIELD_MAPPING,
        pageSize: 200,
        pageToken: "page-2",
      }),
    ).toEqual({
      query: { page_size: "200", page_token: "page-2" },
      body: {
        sort: [{ field_name: "投稿日期", desc: false }],
        filter: {
          conjunction: "and",
          conditions: [
            {
              field_name: "投稿日期",
              operator: "isGreater",
              value: ["ExactDate", 1778579999999],
            },
          ],
        },
      },
    });
  });
});

describe("filterNewFeishuRecords", () => {
  it("keeps only records that do not already exist locally", () => {
    const result = filterNewFeishuRecords(
      [
        { record_id: "rec_old", fields: {} },
        { record_id: "rec_new", fields: {} },
      ],
      new Set(["rec_old"]),
    );

    expect(result).toEqual({
      newRecords: [{ record_id: "rec_new", fields: {} }],
      skippedExisting: 1,
    });
  });
});

describe("summarizeImageCacheResults", () => {
  it("reports image cache success, failure, and skipped counts", () => {
    expect(
      summarizeImageCacheResults([
        { status: "downloaded" },
        { status: "existing" },
        { status: "failed", error: "403" },
        { status: "skipped_limit" },
        { status: "missing_remote_url" },
      ]),
    ).toEqual({
      attempted: 5,
      downloaded: 1,
      existing: 1,
      failed: 1,
      skipped: 2,
    });
  });
});
