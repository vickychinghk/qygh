import { prisma } from "@/lib/prisma";

export const USER_DATA_CLEANUP_PLAN = [
  { model: "selection", scope: "all" },
  { model: "reaction", scope: "all" },
  { model: "issueItem", scope: "all" },
  { model: "issue", scope: "all" },
  { model: "comment", scope: "reset selected flags" },
  { model: "comment", scope: "EDITOR only" },
  { model: "user", scope: "all" },
] as const;

export async function clearUserGeneratedData() {
  await prisma.$transaction([
    prisma.selection.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.issueItem.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.comment.updateMany({ data: { selected: false } }),
    prisma.comment.deleteMany({ where: { source: "EDITOR" } }),
    prisma.user.deleteMany(),
  ]);
}
