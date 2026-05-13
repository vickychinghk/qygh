import { revalidatePath } from "next/cache";
import { normalizeAssetBuffer } from "@/lib/image-pipeline";
import { prisma } from "@/lib/prisma";
import {
  canDeleteComment,
  applySubmissionFilter,
  filterDisplayableImages,
  formatDefaultIssueTitle,
  getUniqueIssueTitle,
  moveIssueItemInDirection,
  reorderIssueItemsToPosition,
  sortSubmissionsBySerialDesc,
  type SubmissionFilter,
} from "@/lib/selection-rules";

export type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>;

const submissionInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: true,
      reactions: { include: { user: true } },
    },
  },
  reactions: { include: { user: true } },
  issueItems: { include: { issue: true } },
};

export async function getDashboardSnapshot(issueId?: string) {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: "desc" },
  });

  const selectedIssueId = issueId ?? issues[0]?.id;
  const issue = selectedIssueId
    ? await prisma.issue.findUnique({
        where: { id: selectedIssueId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              submission: { include: submissionInclude },
            },
          },
        },
      })
    : null;

  const submissions = await prisma.submission.findMany({
    include: submissionInclude,
  });
  const lastSync = await prisma.syncJob.findFirst({
    where: { finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
  });

  const issueWithCachedImages = issue
    ? {
        ...issue,
        items: issue.items.map((item) => ({
          ...item,
          submission: {
            ...item.submission,
            images: filterCachedImages(item.submission.images),
          },
        })),
      }
    : null;

  return {
    issue: issueWithCachedImages,
    issues,
    lastSync,
    submissions: sortSubmissionsBySerialDesc(
      submissions.map((submission) => ({
        ...submission,
        images: filterCachedImages(submission.images),
      })),
    ),
  };
}

function filterCachedImages<T extends { localPath: string }>(images: T[]) {
  return filterDisplayableImages(images);
}

export async function createIssue(title = formatDefaultIssueTitle()) {
  const now = new Date();
  const existingIssues = await prisma.issue.findMany({
    select: { title: true },
  });
  const uniqueTitle = getUniqueIssueTitle(
    title,
    existingIssues.map((issue) => issue.title),
  );
  const issue = await prisma.issue.create({
    data: {
      title: uniqueTitle,
      monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0",
      )}`,
    },
  });

  revalidatePath("/app");
  return issue;
}

export async function renameIssue(issueId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return;
  }

  const duplicate = await prisma.issue.findFirst({
    where: {
      title: trimmed,
      id: { not: issueId },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("刊数名字不能重复");
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { title: trimmed },
  });

  revalidatePath("/app");
}

export async function updateSubmissionSchool(submissionId: string, school: string) {
  const trimmed = school.trim();
  if (!trimmed) {
    return;
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { school: trimmed },
  });

  revalidatePath("/app");
}

export async function addSubmissionToIssue(issueId: string, submissionId: string) {
  const maxItem = await prisma.issueItem.findFirst({
    where: { issueId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.$transaction([
    prisma.issueItem.deleteMany({
      where: {
        submissionId,
        issueId: { not: issueId },
      },
    }),
    prisma.issueItem.upsert({
      where: { issueId_submissionId: { issueId, submissionId } },
      create: {
        issueId,
        submissionId,
        sortOrder: (maxItem?.sortOrder ?? 0) + 1,
        confirmed: false,
      },
      update: {},
    }),
  ]);

  revalidatePath("/app");
}

export async function batchAddFilteredSubmissionsToIssue(
  issueId: string,
  filter: SubmissionFilter,
) {
  const submissions = await prisma.submission.findMany({
    include: {
      issueItems: true,
    },
  });
  const selected = applySubmissionFilter(submissions, filter);

  if (selected.length === 0) {
    return { count: 0 };
  }

  const selectedIds = selected.map((submission) => submission.id);
  const existingTargetItems = await prisma.issueItem.findMany({
    where: { issueId },
    orderBy: { sortOrder: "asc" },
    select: { submissionId: true, sortOrder: true },
  });
  const existingTargetIds = new Set(
    existingTargetItems.map((item) => item.submissionId),
  );
  let nextOrder =
    existingTargetItems.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      0,
    ) + 1;

  const creates = selectedIds
    .filter((submissionId) => !existingTargetIds.has(submissionId))
    .map((submissionId) =>
      prisma.issueItem.create({
        data: {
          issueId,
          submissionId,
          sortOrder: nextOrder++,
          confirmed: false,
        },
      }),
    );

  await prisma.$transaction([
    prisma.issueItem.deleteMany({
      where: {
        submissionId: { in: selectedIds },
        issueId: { not: issueId },
      },
    }),
    ...creates,
  ]);

  revalidatePath("/app");
  return { count: selectedIds.length };
}

export async function batchRemoveFilteredSubmissionsFromIssue(filter: SubmissionFilter) {
  const submissions = await prisma.submission.findMany({
    include: {
      issueItems: true,
    },
  });
  const selected = applySubmissionFilter(submissions, filter);

  if (selected.length === 0) {
    return { count: 0 };
  }

  const selectedIds = selected.map((submission) => submission.id);
  const result = await prisma.issueItem.deleteMany({
    where: {
      submissionId: { in: selectedIds },
    },
  });

  revalidatePath("/app");
  return { count: result.count };
}

export async function moveSubmissionToIssue(submissionId: string, issueId: string) {
  await addSubmissionToIssue(issueId, submissionId);
}

export async function removeSubmissionFromIssue(submissionId: string) {
  const existing = await prisma.issueItem.findFirst({
    where: { submissionId },
    select: { issueId: true },
  });

  if (!existing) {
    return;
  }

  await prisma.issueItem.deleteMany({ where: { submissionId } });
  revalidatePath("/app");
}

export async function toggleSubmissionStar(userId: string, submissionId: string) {
  const existing = await prisma.reaction.findFirst({
    where: { userId, submissionId, kind: "STAR", targetType: "SUBMISSION" },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: { userId, submissionId, kind: "STAR", targetType: "SUBMISSION" },
    });
  }

  revalidatePath("/app");
}

export async function toggleCommentStar(userId: string, commentId: string) {
  const existing = await prisma.reaction.findFirst({
    where: { userId, commentId, kind: "STAR", targetType: "COMMENT" },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: { userId, commentId, kind: "STAR", targetType: "COMMENT" },
    });
  }

  revalidatePath("/app");
}

export async function setSubmissionIssueConfirmed(
  issueId: string,
  submissionId: string,
  confirmed: boolean,
) {
  const existing = await prisma.issueItem.findUnique({
    where: { issueId_submissionId: { issueId, submissionId } },
  });
  const maxItem = await prisma.issueItem.findFirst({
    where: { issueId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.$transaction([
    prisma.issueItem.deleteMany({
      where: {
        submissionId,
        issueId: { not: issueId },
      },
    }),
    prisma.issueItem.upsert({
      where: { issueId_submissionId: { issueId, submissionId } },
      create: {
        issueId,
        submissionId,
        sortOrder: (maxItem?.sortOrder ?? 0) + 1,
        confirmed,
      },
      update: {
        confirmed,
        sortOrder: existing?.sortOrder ?? (maxItem?.sortOrder ?? 0) + 1,
      },
    }),
  ]);

  revalidatePath("/app");
}

export async function setSubmissionImageEnabled(imageId: string, enabled: boolean) {
  await prisma.submissionImage.update({
    where: { id: imageId },
    data: { enabled },
  });

  revalidatePath("/app");
}

export async function addSubmissionImage(submissionId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("只能上传图片");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const asset = await normalizeAssetBuffer({
    buffer: bytes,
    fileName: file.name || "manual-upload",
    remoteMimeType: file.type || null,
    source: "manual",
    token: crypto.randomUUID(),
  });

  const maxImage = await prisma.submissionImage.findFirst({
    where: { submissionId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.submissionImage.create({
    data: {
      submissionId,
      localPath: asset.localPath,
      originalPath: asset.originalPath,
      assetKind: asset.assetKind,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      originalBytes: asset.originalBytes,
      processedBytes: asset.processedBytes,
      originalFormat: asset.originalFormat,
      processedFormat: asset.processedFormat,
      mimeType: asset.mimeType,
      processingStatus: asset.processingStatus,
      processingError: asset.processingError,
      enabled: true,
      sortOrder: (maxImage?.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/app");
}

export async function addComment(userId: string, submissionId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }

  await prisma.comment.create({
    data: { authorId: userId, submissionId, body: trimmed, source: "EDITOR" },
  });

  revalidatePath("/app");
}

export async function updateComment(
  userId: string,
  commentId: string,
  body: string,
) {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }

  await prisma.comment.updateMany({
    where: { id: commentId, authorId: userId, source: "EDITOR" },
    data: { body: trimmed },
  });

  revalidatePath("/app");
}

export async function deleteComment(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, selected: true, source: true },
  });

  if (!comment) {
    return;
  }

  const result = canDeleteComment(userId, {
    authorId: comment.authorId,
    selected: comment.selected,
    source: comment.source as "EDITOR" | "SUBMITTER",
  });

  if (!result.allowed) {
    throw new Error(result.reason);
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath("/app");
}

export async function selectFinalComment(submissionId: string, commentId: string) {
  const current = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { selected: true },
  });

  await prisma.$transaction([
    prisma.comment.updateMany({
      where: { submissionId },
      data: { selected: false },
    }),
    prisma.comment.update({
      where: { id: commentId },
      data: { selected: !current?.selected },
    }),
  ]);

  revalidatePath("/app");
}

export async function moveIssueItem(issueItemId: string, direction: "up" | "down") {
  const current = await prisma.issueItem.findUnique({
    where: { id: issueItemId },
  });

  if (!current) {
    return;
  }

  const items = await prisma.issueItem.findMany({
    where: { issueId: current.issueId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const nextItems = moveIssueItemInDirection(items, issueItemId, direction);

  await prisma.$transaction(
    nextItems.map((item) =>
      prisma.issueItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );

  revalidatePath("/app");
}

export async function updateIssueItemSortOrder(
  issueItemId: string,
  sortOrder: number,
) {
  if (!Number.isFinite(sortOrder)) {
    return;
  }

  const current = await prisma.issueItem.findUnique({
    where: { id: issueItemId },
    select: { issueId: true },
  });
  if (!current) {
    return;
  }

  const items = await prisma.issueItem.findMany({
    where: { issueId: current.issueId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const nextItems = reorderIssueItemsToPosition(items, issueItemId, Math.trunc(sortOrder));

  await prisma.$transaction(
    nextItems.map((item) =>
      prisma.issueItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );

  revalidatePath("/app");
}

export async function getExportIssue(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          submission: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
              comments: true,
            },
          },
        },
      },
    },
  });

  if (!issue) {
    return null;
  }

  return {
    title: issue.title,
    items: issue.items.map((item) => ({
      confirmed: item.confirmed,
      sortOrder: item.sortOrder,
      school: item.submission.school,
      consentGranted: item.submission.consentGranted,
      submitterQuote: item.submission.submitterQuote,
      finalComment:
        item.submission.comments.find((comment) => comment.selected)?.body ?? null,
      images: item.submission.images
        .filter(
          (image) =>
            image.enabled &&
            image.processingStatus === "READY" &&
            (image.assetKind === "IMAGE" || image.assetKind === "GIF"),
        )
        .map((image) => ({
          src: image.localPath,
          width: image.width,
          height: image.height,
        })),
    })),
  };
}

export async function getPreviewIssue(issueId: string) {
  return getExportIssue(issueId);
}
