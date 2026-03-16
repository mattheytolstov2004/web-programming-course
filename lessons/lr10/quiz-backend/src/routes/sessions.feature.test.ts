import { describe, it, expect } from "vitest";
import app from "../../src/index.js";

describe("Sessions endpoints security check", () => {
  it("GET all sessions should be protected", async () => {
    const response = await app.request("/api/sessions");
    expect(response.status).toBe(401);
  });

  it("POST create session requires auth", async () => {
    const response = await app.request("/api/sessions", { 
      method: "POST" 
    });
    expect(response.status).toBe(401);
  });

  it("POST answers without token gets 401", async () => {
    const response = await app.request("/api/sessions/test-123/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        questionId: "q1", 
        userAnswer: ["a"] 
      }),
    });
    expect(response.status).toBe(401);
  });

  it("POST submit without auth should fail", async () => {
    const response = await app.request("/api/sessions/abc-123/submit", { 
      method: "POST" 
    });
    expect(response.status).toBe(401);
  });
});