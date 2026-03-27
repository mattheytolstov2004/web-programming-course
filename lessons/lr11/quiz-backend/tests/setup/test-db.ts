import { prisma } from "../../src/db/prisma.js";

export const resetTestDb = async () => {
  await prisma.answer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.question.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};