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
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);

  const [vicky, qing, nan] = await Promise.all([
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

  const issue = await prisma.issue.create({
    data: {
      title: "2026 年 5 月第 1 篇",
      monthKey: "2026-05",
    },
  });

  const submissions = await Promise.all([
    prisma.submission.create({
      data: {
        feishuRecordId: "rec_mock_001",
        serialNumber: "001",
        school: "东湖中学",
        submitterQuote: "校门口这个提示牌看了三遍，还是不知道到底让不让进。",
        consentGranted: true,
        submittedAt: new Date("2026-05-01T10:12:00+08:00"),
        status: "READY",
        images: {
          create: [
            { localPath: "/mock/submission-1.svg", sortOrder: 0 },
            { localPath: "/mock/submission-2.svg", sortOrder: 1 },
          ],
        },
      },
    }),
    prisma.submission.create({
      data: {
        feishuRecordId: "rec_mock_002",
        serialNumber: "002",
        school: "南山大学",
        submitterQuote: "这份通知同时要求“自愿参加”和“必须到场”，非常稳定地矛盾。",
        consentGranted: true,
        submittedAt: new Date("2026-05-03T18:40:00+08:00"),
        status: "READY",
        images: {
          create: [{ localPath: "/mock/submission-3.svg", sortOrder: 0 }],
        },
      },
    }),
    prisma.submission.create({
      data: {
        feishuRecordId: "rec_mock_003",
        serialNumber: "003",
        school: "北城学院",
        submitterQuote: "明明是线上会议，地点写了操场主席台。",
        consentGranted: false,
        submittedAt: new Date("2026-05-05T08:26:00+08:00"),
        status: "PENDING",
        images: {
          create: [{ localPath: "/mock/submission-4.svg", sortOrder: 0 }],
        },
      },
    }),
  ]);

  await Promise.all(
    submissions.map((submission, index) =>
      prisma.issueItem.create({
        data: {
          issueId: issue.id,
          submissionId: submission.id,
          sortOrder: index + 1,
          confirmed: index < 2,
        },
      }),
    ),
  );

  const firstComments = await Promise.all([
    prisma.comment.create({
      data: {
        submissionId: submissions[0].id,
        authorId: vicky.id,
        body: "这不是通知，是文字版密室逃脱。",
        selected: true,
      },
    }),
    prisma.comment.create({
      data: {
        submissionId: submissions[0].id,
        authorId: qing.id,
        body: "建议校门口配一个翻译官。",
      },
    }),
    prisma.comment.create({
      data: {
        submissionId: submissions[1].id,
        authorId: nan.id,
        body: "自愿但必须，主打一个精神分裂式管理。",
        selected: true,
      },
    }),
  ]);

  await Promise.all([
    prisma.reaction.create({
      data: {
        userId: qing.id,
        kind: "STAR",
        targetType: "SUBMISSION",
        submissionId: submissions[0].id,
      },
    }),
    prisma.reaction.create({
      data: {
        userId: nan.id,
        kind: "STAR",
        targetType: "SUBMISSION",
        submissionId: submissions[0].id,
      },
    }),
    prisma.reaction.create({
      data: {
        userId: vicky.id,
        kind: "STAR",
        targetType: "COMMENT",
        commentId: firstComments[0].id,
      },
    }),
  ]);
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
