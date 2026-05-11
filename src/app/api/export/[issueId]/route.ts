import { NextResponse } from "next/server";
import { buildIssueHtml } from "@/lib/export-html";
import { getExportIssue } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;
  const issue = await getExportIssue(issueId);

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return new NextResponse(buildIssueHtml(issue), {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
