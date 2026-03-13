import { describe, it, expect } from "vitest";
import app from "../../src/index.js";

describe("Auth API проверка", () => {
  it("health check — должен отвечать 200 и статус ok", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe("ok");
  });

  it("/api/auth/me — без токена должен возвращать 401", async () => {
    const response = await app.request("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("/api/auth/github/callback — пустой code дает 400", async () => {
    const response = await app.request("/api/auth/github/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "" }),
    });
    expect(response.status).toBe(400);
  });

  it("/api/auth/github/callback — кривой JSON ловит 500", async () => {
    const response = await app.request("/api/auth/github/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "это не json",
    });
    expect(response.status).toBe(500);
  });
});