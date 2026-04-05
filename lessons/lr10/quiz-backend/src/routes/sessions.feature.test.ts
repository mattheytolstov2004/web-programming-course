import { describe, it, expect, beforeAll } from "vitest";
import app from "../../src/index.js";
import { prisma } from "../../src/lib/prisma.js";
import { sign } from "hono/jwt";
import { syncQuestionsFromAPI } from "../../src/services/questionSyncService.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "your-secret-key-change-in-production";

// Создаём тестового пользователя
async function createTestUser() {
  const user = await prisma.user.upsert({
    where: { githubId: "test-feature-user" },
    update: {},
    create: {
      githubId: "test-feature-user",
      email: "feature-test@example.com",
      name: "Feature Test User",
    },
  });

  const token = await sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    "HS256"
  );

  return { user, token };
}

// Синхронизируем вопросы перед тестами
beforeAll(async () => {
  await syncQuestionsFromAPI();
});

describe("Sessions — получение вопросов из БД", () => {

  it("POST /api/sessions — создаёт сессию и возвращает 10 вопросов из БД", async () => {
    const { token } = await createTestUser();

    const questionsBefore = await prisma.question.count();

    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(201);
    const body = await res.json();

    const questionsAfter = await prisma.question.count();

    // Проверяем структуру ответа
    expect(body.sessionId).toBeDefined();
    expect(body.questions).toBeDefined();
    expect(body.questions.length).toBeGreaterThan(0);
    expect(body.totalQuestions).toBe(body.questions.length);
    expect(body.maxScore).toBeGreaterThan(0);

    // Проверяем индексы вопросов
    body.questions.forEach((q: { index: number }, i: number) => {
      expect(q.index).toBe(i);
    });

    // Проверяем что сессия сохранилась в БД с questionIds
    const session = await prisma.session.findUnique({
      where: { id: body.sessionId },
    });
    expect(session).not.toBeNull();
    const savedIds = JSON.parse(session!.questionIds) as string[];
    expect(savedIds.length).toBe(body.questions.length);

    // Вывод результатов
    console.log("\n" + "=".repeat(60));
    console.log("📋 СЕССИЯ СОЗДАНА");
    console.log("=".repeat(60));
    console.log(`  Session ID:      ${body.sessionId}`);
    console.log(`  Всего вопросов:  ${body.totalQuestions}`);
    console.log(`  Макс. баллов:    ${body.maxScore}`);
    console.log(`  Истекает:        ${body.expiresAt}`);
    console.log(`  Вопросов в БД:   ${questionsBefore} → ${questionsAfter}`);

    console.log("\n" + "=".repeat(60));
    console.log("❓ ВОПРОСЫ ИЗ БД:");
    console.log("=".repeat(60));
    body.questions.forEach((q: {
      index: number
      id: string
      type: string
      question: string
      categoryId: string
      maxPoints: number
    }) => {
      console.log(`\n${q.index + 1}. [${q.type}] ${q.question}`);
      console.log(`   ID:        ${q.id}`);
      console.log(`   Категория: ${q.categoryId}`);
      console.log(`   Баллы:     ${q.maxPoints}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("💾 QUESTION IDs В СЕССИИ:");
    console.log("=".repeat(60));
    savedIds.forEach((id: string, i: number) => {
      console.log(`  ${i + 1}. ${id}`);
    });
    console.log("=".repeat(60) + "\n");
  });

  it("POST /api/sessions/:id/answers — возвращает questionIndex и isLast", async () => {
    const { token } = await createTestUser();

    // Создаём сессию
    const sessionRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const session = await sessionRes.json();

    const firstQuestion = session.questions[0];
    const lastQuestion = session.questions[session.questions.length - 1];

    // Отвечаем на первый вопрос
    const answerRes = await app.request(`/api/sessions/${session.sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionId: firstQuestion.id, userAnswer: ["0"] }),
    });

    expect(answerRes.status).toBe(201);
    const answerBody = await answerRes.json();

    expect(answerBody.questionIndex).toBe(0);
    expect(answerBody.totalQuestions).toBe(10);
    expect(answerBody.isLast).toBe(false);

    console.log("\n✅ Ответ на первый вопрос:");
    console.log(`   questionIndex: ${answerBody.questionIndex} / ${answerBody.totalQuestions}`);
    console.log(`   isLast: ${answerBody.isLast}`);

    // Отвечаем на последний вопрос
    const lastAnswerRes = await app.request(`/api/sessions/${session.sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionId: lastQuestion.id, userAnswer: ["0"] }),
    });

    const lastAnswerBody = await lastAnswerRes.json();
    expect(lastAnswerBody.questionIndex).toBe(9);
    expect(lastAnswerBody.isLast).toBe(true);

    console.log(`\n✅ Ответ на последний вопрос:`);
    console.log(`   questionIndex: ${lastAnswerBody.questionIndex} / ${lastAnswerBody.totalQuestions}`);
    console.log(`   isLast: ${lastAnswerBody.isLast}\n`);
  });

  it("POST /api/sessions — без токена возвращает 401", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

});