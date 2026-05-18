export { SCHOOL_OPTIONS } from "@/lib/school-theme";

export type CommentSelectionState = {
  id: string;
  submissionId: string;
  selected: boolean;
};

export type CommentDeleteState = {
  authorId: string | null;
  selected: boolean;
  source?: "EDITOR" | "SUBMITTER";
};

export type SubmissionFilter = {
  school?: string;
  authorized?: "all" | "yes" | "no";
  assignStatus?: "all" | "assigned" | "unassigned";
  adoptStatus?: "all" | "adopted" | "notAdopted";
  reactionStatus?: "all" | "liked" | "notLiked";
  dateFrom?: string;
  dateTo?: string;
  serialFrom?: string;
  serialTo?: string;
};

export function selectFinalCommentState<T extends CommentSelectionState>(
  comments: T[],
  submissionId: string,
  commentId: string,
) {
  return comments.map((comment) => {
    if (comment.submissionId !== submissionId) {
      return comment;
    }

    return {
      ...comment,
      selected: comment.id === commentId,
    };
  });
}

export function formatDefaultIssueTitle(date = new Date()) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月刊`;
}

export function getUniqueIssueTitle(baseTitle: string, existingTitles: string[]) {
  const trimmed = baseTitle.trim();
  const title = trimmed || formatDefaultIssueTitle();
  const existing = new Set(existingTitles.map((item) => item.trim()));

  if (!existing.has(title)) {
    return title;
  }

  let suffix = 1;
  while (existing.has(`${title}_${suffix}`)) {
    suffix += 1;
  }

  return `${title}_${suffix}`;
}

export function sortSubmissionsBySerialDesc<T extends { serialNumber: string | null }>(
  submissions: T[],
) {
  return [...submissions].sort((a, b) => {
    const aNumber = Number.parseInt(a.serialNumber ?? "", 10);
    const bNumber = Number.parseInt(b.serialNumber ?? "", 10);

    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return bNumber - aNumber;
    }

    return (b.serialNumber ?? "").localeCompare(a.serialNumber ?? "", "zh-CN", {
      numeric: true,
    });
  });
}

export function sortCommentsForDisplay<
  T extends { createdAt: Date | string; reactions: unknown[] },
>(comments: T[]) {
  return [...comments].sort((a, b) => {
    const reactionDelta = b.reactions.length - a.reactions.length;
    if (reactionDelta !== 0) {
      return reactionDelta;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function sortImagesForEditing<
  T extends { enabled?: boolean | null; updatedAt?: Date | string | null; sortOrder?: number },
>(images: T[]) {
  return [...images].sort((a, b) => {
    const aEnabled = a.enabled !== false;
    const bEnabled = b.enabled !== false;

    if (aEnabled !== bEnabled) {
      return aEnabled ? -1 : 1;
    }

    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : a.sortOrder ?? 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : b.sortOrder ?? 0;
    return aTime - bTime;
  });
}

export function getSubmissionIssueLabel(
  issueItems: { issue: { title: string } }[],
) {
  return issueItems[0]?.issue.title
    ? `已加入 ${issueItems[0].issue.title}`
    : "未分配任何刊数";
}

export function hasUserReacted(
  reactions: { userId?: string | null }[],
  currentUserId: string,
) {
  return reactions.some((reaction) => reaction.userId === currentUserId);
}

export function applySubmissionFilter<
  T extends {
    school: string;
    consentGranted: boolean;
    submittedAt: Date | string;
    serialNumber: string | null;
    issueItems: { issueId?: string; confirmed?: boolean }[];
    reactions?: { userId?: string | null }[];
  },
>(
  submissions: T[],
  filter: SubmissionFilter,
  context: { currentUserId?: string } = {},
) {
  return submissions.filter((submission) => {
    if (filter.school && !submission.school.includes(filter.school)) {
      return false;
    }

    if (filter.authorized === "yes" && !submission.consentGranted) {
      return false;
    }

    if (filter.authorized === "no" && submission.consentGranted) {
      return false;
    }

    if (filter.assignStatus === "assigned" && submission.issueItems.length === 0) {
      return false;
    }

    if (filter.assignStatus === "unassigned" && submission.issueItems.length > 0) {
      return false;
    }

    const adopted = submission.issueItems.some((item) => item.confirmed);
    if (filter.adoptStatus === "adopted" && !adopted) {
      return false;
    }

    if (filter.adoptStatus === "notAdopted" && adopted) {
      return false;
    }

    if (
      context.currentUserId &&
      filter.reactionStatus &&
      filter.reactionStatus !== "all"
    ) {
      const liked = hasUserReacted(
        submission.reactions ?? [],
        context.currentUserId,
      );
      if (filter.reactionStatus === "liked" && !liked) {
        return false;
      }
      if (filter.reactionStatus === "notLiked" && liked) {
        return false;
      }
    }

    const submittedDate = formatDateKey(submission.submittedAt);
    if (filter.dateFrom && submittedDate < filter.dateFrom) {
      return false;
    }

    if (filter.dateTo && submittedDate > filter.dateTo) {
      return false;
    }

    const serial = Number.parseInt(submission.serialNumber ?? "", 10);
    const serialFrom = Number.parseInt(filter.serialFrom ?? "", 10);
    const serialTo = Number.parseInt(filter.serialTo ?? "", 10);
    if (Number.isFinite(serialFrom) && (!Number.isFinite(serial) || serial < serialFrom)) {
      return false;
    }

    if (Number.isFinite(serialTo) && (!Number.isFinite(serial) || serial > serialTo)) {
      return false;
    }

    return true;
  });
}

export function reorderIssueItemsToPosition<T extends { id: string; sortOrder: number }>(
  items: T[],
  issueItemId: string,
  targetPosition: number,
) {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = sorted.find((item) => item.id === issueItemId);

  if (!current) {
    return sorted;
  }

  const start = targetPosition <= 0 ? targetPosition : 1;
  const withoutCurrent = sorted.filter((item) => item.id !== issueItemId);
  const targetIndex = Math.max(
    0,
    Math.min(targetPosition - start, withoutCurrent.length),
  );
  withoutCurrent.splice(targetIndex, 0, current);

  return renumberIssueItems(withoutCurrent, start);
}

export function moveIssueItemInDirection<T extends { id: string; sortOrder: number }>(
  items: T[],
  issueItemId: string,
  direction: "up" | "down",
) {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = sorted.findIndex((item) => item.id === issueItemId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= sorted.length
  ) {
    return renumberIssueItems(sorted, getIssueOrderStart(sorted));
  }

  const next = [...sorted];
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];

  return renumberIssueItems(next, getIssueOrderStart(sorted));
}

function getIssueOrderStart(items: { sortOrder: number }[]) {
  const smallest = Math.min(...items.map((item) => item.sortOrder));
  return Number.isFinite(smallest) && smallest <= 0 ? Math.trunc(smallest) : 1;
}

function renumberIssueItems<T extends { sortOrder: number }>(items: T[], start: number) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: start + index,
  }));
}

export function parseIssueSortOrderInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function canDeleteComment(
  currentUserId: string,
  comment: CommentDeleteState,
): { allowed: true } | { allowed: false; reason: string } {
  if (comment.source === "SUBMITTER") {
    return { allowed: false, reason: "投稿人吐槽语不能删除" };
  }

  if (comment.selected) {
    return { allowed: false, reason: "已采用，需先取消采用" };
  }

  if (comment.authorId !== currentUserId) {
    return { allowed: false, reason: "只能删除自己的吐槽语" };
  }

  return { allowed: true };
}

export function filterDisplayableImages<
  T extends {
    localPath: string;
    assetKind?: string | null;
    processingStatus?: string | null;
  },
>(
  images: T[],
  _exists?: (localPath: string) => boolean,
) {
  return images.filter((image) => {
    if (image.assetKind === "VIDEO" || image.assetKind === "UNSUPPORTED") {
      return true;
    }

    if (image.processingStatus && image.processingStatus !== "READY") {
      return image.assetKind === "VIDEO" || image.assetKind === "UNSUPPORTED";
    }

    return isWebDisplayableImage(image.localPath);
  });
}

export function isWebDisplayableImage(localPath: string) {
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(localPath);
}

function formatDateKey(date: Date | string) {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
