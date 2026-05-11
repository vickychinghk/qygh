"use server";

import {
  addComment,
  moveIssueItem,
  selectFinalComment,
  setIssueItemConfirmed,
  toggleCommentStar,
  toggleSubmissionStar,
} from "@/lib/data";
import { requireCurrentUser } from "@/lib/auth";

export async function toggleSubmissionStarAction(submissionId: string) {
  const user = await requireCurrentUser();
  await toggleSubmissionStar(user.id, submissionId);
}

export async function toggleCommentStarAction(commentId: string) {
  const user = await requireCurrentUser();
  await toggleCommentStar(user.id, commentId);
}

export async function setIssueItemConfirmedAction(
  issueItemId: string,
  confirmed: boolean,
) {
  await requireCurrentUser();
  await setIssueItemConfirmed(issueItemId, confirmed);
}

export async function addCommentAction(submissionId: string, body: string) {
  const user = await requireCurrentUser();
  await addComment(user.id, submissionId, body);
}

export async function selectFinalCommentAction(
  submissionId: string,
  commentId: string,
) {
  await requireCurrentUser();
  await selectFinalComment(submissionId, commentId);
}

export async function moveIssueItemAction(
  issueItemId: string,
  direction: "up" | "down",
) {
  await requireCurrentUser();
  await moveIssueItem(issueItemId, direction);
}
