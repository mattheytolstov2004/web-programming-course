import { describe, it, expect, beforeEach } from "vitest"
import { app } from "../../tests/setup/test-app.js"
import { resetTestDb } from "../../tests/setup/test-db.js"
import { prisma } from "../db/prisma.js"

describe("Admin security", () => {
  let studentToken: string

  beforeEach(async () => {
    await resetTestDb()

    // Используем уникальный код для создания студента
    const timestamp = Date.now()
    const authRes = await app.request("/api/auth/github/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: `test_student_${timestamp}` }) // уникальный код
    })
    const authData = await authRes.json()
    studentToken = authData.token
  })

  it("student cannot access admin endpoint", async () => {
    const res = await app.request("/api/admin", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    })

    expect(res.status).toBe(403)
  })
})