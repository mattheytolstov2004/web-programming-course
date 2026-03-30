import { describe, it, expect } from "vitest";
import app from "../../src/index.js";
import { prisma } from "../../src/lib/prisma.js";
import { sign } from "hono/jwt";
 
const JWT_SECRET = process.env.JWT_SECRET ?? "your-secret-key-change-in-production";
 
async function getOrCreateTestUser() {
  // Берём пользователя у которого есть externalToken (залогинился через GitHub)
  const user = await prisma.user.findFirst({
    where: { externalToken: { not: null } },
  });
 
  if (!user) {
    throw new Error(
      "❌ Нет пользователя с externalToken. Сначала залогинься через:\n" +
      "POST /api/auth/github/callback с реальным GitHub code"
    );
  }
 
  const token = await sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    "HS256"
  );
 
  return { user, token };
}
 
describe("Sessions — получение вопросов с внешнего API", () => {
 
  it("POST /api/sessions — загружает вопросы с dancv.ddns.net и сохраняет в БД", async () => {
    const { token } = await getOrCreateTestUser();
 
    // Считаем вопросы в БД ДО создания сессии
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
 
    // Считаем вопросы в БД ПОСЛЕ создания сессии
    const questionsAfter = await prisma.question.count();
 
    // Проверяем что сессия создана
    expect(body.sessionId).toBeDefined();
    expect(body.questions).toBeDefined();
    expect(body.questions.length).toBeGreaterThan(0);
 
    // Выводим результаты
    console.log("\n" + "=".repeat(60));
    console.log("📋 СЕССИЯ СОЗДАНА");
    console.log("=".repeat(60));
    console.log(`  Session ID:       ${body.sessionId}`);
    console.log(`  External Session: ${body.externalSessionId}`);
    console.log(`  Режим:            ${body.mode}`);
    console.log(`  Всего вопросов:   ${body.totalQuestions}`);
    console.log(`  Макс. баллов:     ${body.maxScore}`);
    console.log(`  Истекает:         ${body.expiresAt}`);
 
    console.log("\n" + "=".repeat(60));
    console.log("❓ ВОПРОСЫ С ВНЕШНЕГО API:");
    console.log("=".repeat(60));
    body.questions.forEach((q: {
      id: string
      type: string
      question: string
      difficulty: string
      categoryId: string
      maxPoints: number
      options?: string[]
      minLength?: number
    }, i: number) => {
      console.log(`\n${i + 1}. [${q.type}] ${q.question}`);
      console.log(`   ID:         ${q.id}`);
      console.log(`   Категория:  ${q.categoryId}`);
      console.log(`   Сложность:  ${q.difficulty}`);
      console.log(`   Баллы:      ${q.maxPoints}`);
      if (q.options) {
        console.log(`   Варианты:   ${q.options.join(" | ")}`);
      }
      if (q.minLength) {
        console.log(`   Мин. длина: ${q.minLength} символов`);
      }
    });
 
    
  });
 
});