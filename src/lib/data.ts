import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>;

export async function getDashboardSnapshot() {
  const issue = await prisma.issue.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          submission: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
              comments: {
                orderBy: { createdAt: "asc" },
                include: {
                  author: true,
                  reactions: true,
                },
              },
              reactions: true,
            },
          },
        },
      },
    },
  });

  if (!issue) {
    return null;
  }

  const submissions = await prisma.submission.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: true,
          reactions: true,
        },
      },
      reactions: true,
      issueItems: true,
    },
  });

  return { issue, submissions };
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

export async function setIssueItemConfirmed(issueItemId: string, confirmed: boolean) {
  await prisma.issueItem.update({
    where: { id: issueItemId },
    data: { confirmed },
  });

  revalidatePath("/app");
}

export async function addComment(userId: string, submissionId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }

  await prisma.comment.create({
    data: { authorId: userId, submissionId, body: trimmed },
  });

  revalidatePath("/app");
}

export async function selectFinalComment(submissionId: string, commentId: string) {
  await prisma.$transaction([
    prisma.comment.updateMany({
      where: { submissionId },
      data: { selected: false },
    }),
    prisma.comment.update({
      where: { id: commentId },
      data: { selected: true },
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

  const neighbor = await prisma.issueItem.findFirst({
    where: {
      issueId: current.issueId,
      sortOrder:
        direction === "up"
          ? { lt: current.sortOrder }
          : { gt: current.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    return;
  }

  await prisma.$transaction([
    prisma.issueItem.update({
      where: { id: current.id },
      data: { sortOrder: neighbor.sortOrder },
    }),
    prisma.issueItem.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

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
      submitterQuote: item.submission.submitterQuote,
      finalComment:
        item.submission.comments.find((comment) => comment.selected)?.body ?? null,
      images: item.submission.images.map((image) => image.localPath),
    })),
  };
}
