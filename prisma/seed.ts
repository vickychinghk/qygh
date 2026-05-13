import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.selection.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issueItem.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.submissionImage.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);

  await Promise.all([
    prisma.user.create({
      data: { username: "vicky", displayName: "Vicky", passwordHash },
    }),
    prisma.user.create({
      data: { username: "qing", displayName: "青", passwordHash },
    }),
    prisma.user.create({
      data: { username: "nan", displayName: "南风", passwordHash },
    }),
  ]);

  await prisma.issue.create({
    data: {
      title: "2026.5.12 期",
      monthKey: "2026-05",
    },
  });
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
