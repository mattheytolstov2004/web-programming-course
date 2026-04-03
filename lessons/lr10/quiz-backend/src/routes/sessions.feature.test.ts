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
      "Нет пользователя с externalToken. Сначала залогинься через:\n" +
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
 
    // Проверяем что сессия создана
    expect(body.sessionId).toBeDefined();
    expect(body.questions).toBeDefined();
    expect(body.questions.length).toBeGreaterThan(0);
 
    // Выводим результат
    
  });
 
});