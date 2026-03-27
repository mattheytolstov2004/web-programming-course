import { describe, it, expect } from "vitest"
import { app } from "../app.js"

describe("Auth feature", () => {

  it("health check works", async () => {
    const res = await app.request("/health")

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.status).toBe("ok")
  })

  it("github callback returns token", async () => {
  const res = await app.request("/api/auth/github/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "test_ok"
    })
  })

  expect(res.status).toBe(200)

  const data = await res.json()
  expect(data.token).toBeDefined()
})

  it("me endpoint without token returns 401", async () => {
    const res = await app.request("/api/auth/me")

    expect(res.status).toBe(401)
  })

})

it("me endpoint with invalid token returns 401", async () => {
  const res = await app.request("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: "Bearer invalid_token",
    },
  })

  expect(res.status).toBe(401)
})

it("github callback with invalid payload returns 400", async () => {
  const res = await app.request("/api/auth/github/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })

  expect(res.status).toBe(400)
})