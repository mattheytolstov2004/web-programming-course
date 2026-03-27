import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockDeep, mockReset } from "vitest-mock-extended"
import type { PrismaClient } from "@prisma/client"

import { scoringService } from "./scoringService.js"
import { prisma } from "../db/prisma.js"

// создаём deep mock prisma
vi.mock("../db/prisma.js", () => ({
  prisma: mockDeep<PrismaClient>()
}))

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>

beforeEach(() => {
  mockReset(prismaMock)
})

describe("ScoringService", () => {

  it("should give full score when answers match exactly", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A", "B"],
      ["A", "B"]
    )

    expect(result).toBe(1)
  })

  it("should give partial score when one answer is correct", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A"],
      ["A", "B"]
    )

    expect(result).toBe(0.5)
  })

  it("should return zero when no answers match", () => {
    const result = scoringService.scoreMultipleSelect(
      ["C"],
      ["A", "B"]
    )

    expect(result).toBe(0)
  })

  it("should ignore order of answers", () => {
    const result = scoringService.scoreMultipleSelect(
      ["B", "A"],
      ["A", "B"]
    )

    expect(result).toBe(1)
  })

  it("should handle empty user answers", () => {
    const result = scoringService.scoreMultipleSelect(
      [],
      ["A", "B"]
    )

    expect(result).toBe(0)
  })

  it("should handle extra incorrect answers", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A", "B", "C"],
      ["A", "B"]
    )

    expect(result).toBeLessThanOrEqual(1)
  })

})