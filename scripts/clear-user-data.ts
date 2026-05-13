import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.selection.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.issueItem.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.comment.updateMany({ data: { selected: false } }),
    prisma.comment.deleteMany({ where: { source: "EDITOR" } }),
    prisma.user.deleteMany(),
  ]);

  console.log(
    "Cleared users, editor comments, reactions, selections, issues, and adoption flags. Feishu submissions, images, sync jobs, and submitter comments were preserved.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
