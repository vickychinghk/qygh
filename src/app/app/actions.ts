"use server";

import {
  addSubmissionImage,
  addSubmissionToIssue,
  addComment,
  batchAddFilteredSubmissionsToIssue,
  createIssue,
  deleteComment,
  moveIssueItem,
  moveSubmissionToIssue,
  renameIssue,
  removeSubmissionFromIssue,
  reorderIssueItemToPosition,
  selectFinalComment,
  setSubmissionImageEnabled,
  setSubmissionIssueConfirmed,
  toggleCommentStar,
  toggleSubmissionStar,
  updateComment,
  updateSubmissionSchool,
} from "@/lib/data";
import { requireCurrentUser, signOut } from "@/lib/auth";
import { clearBusinessData, syncFeishuSubmissions } from "@/lib/feishu-sync";
import type { SubmissionFilter } from "@/lib/selection-rules";

export async function toggleSubmissionStarAction(submissionId: string) {
  const user = await requireCurrentUser();
  await toggleSubmissionStar(user.id, submissionId);
}

export async function toggleCommentStarAction(commentId: string) {
  const user = await requireCurrentUser();
  await toggleCommentStar(user.id, commentId);
}

export async function createIssueAction(title?: string) {
  await requireCurrentUser();
  const issue = await createIssue(title);
  return issue.id;
}

export async function renameIssueAction(issueId: string, title: string) {
  await requireCurrentUser();
  await renameIssue(issueId, title);
}

export async function updateSubmissionSchoolAction(
  submissionId: string,
  school: string,
) {
  await requireCurrentUser();
  await updateSubmissionSchool(submissionId, school);
}

export async function addSubmissionToIssueAction(
  issueId: string,
  submissionId: string,
) {
  await requireCurrentUser();
  await addSubmissionToIssue(issueId, submissionId);
}

export async function batchAddFilteredSubmissionsToIssueAction(
  issueId: string,
  filter: SubmissionFilter,
) {
  await requireCurrentUser();
  return batchAddFilteredSubmissionsToIssue(issueId, filter);
}

export async function moveSubmissionToIssueAction(
  submissionId: string,
  issueId: string,
) {
  await requireCurrentUser();
  await moveSubmissionToIssue(submissionId, issueId);
}

export async function removeSubmissionFromIssueAction(submissionId: string) {
  await requireCurrentUser();
  await removeSubmissionFromIssue(submissionId);
}

export async function setSubmissionIssueConfirmedAction(
  issueId: string,
  submissionId: string,
  confirmed: boolean,
) {
  await requireCurrentUser();
  await setSubmissionIssueConfirmed(issueId, submissionId, confirmed);
}

export async function addCommentAction(submissionId: string, body: string) {
  const user = await requireCurrentUser();
  await addComment(user.id, submissionId, body);
}

export async function updateCommentAction(commentId: string, body: string) {
  const user = await requireCurrentUser();
  await updateComment(user.id, commentId, body);
}

export async function deleteCommentAction(commentId: string) {
  const user = await requireCurrentUser();
  await deleteComment(user.id, commentId);
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

export async function reorderIssueItemToPositionAction(
  issueItemId: string,
  targetPosition: number,
) {
  await requireCurrentUser();
  await reorderIssueItemToPosition(issueItemId, targetPosition);
}

export async function setSubmissionImageEnabledAction(
  imageId: string,
  enabled: boolean,
) {
  await requireCurrentUser();
  await setSubmissionImageEnabled(imageId, enabled);
}

export async function addSubmissionImageAction(formData: FormData) {
  await requireCurrentUser();
  const submissionId = String(formData.get("submissionId") ?? "");
  const file = formData.get("file");

  if (!submissionId || !(file instanceof File)) {
    throw new Error("缺少投稿或图片文件");
  }

  await addSubmissionImage(submissionId, file);
}

export async function syncFeishuSubmissionsAction() {
  await requireCurrentUser();
  return syncFeishuSubmissions();
}

export async function clearBusinessDataAction() {
  await requireCurrentUser();
  return clearBusinessData();
}

export async function logoutAction() {
  await signOut();
}
