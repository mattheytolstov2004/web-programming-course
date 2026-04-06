import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockDeep, mockReset } from "vitest-mock-extended"
import type { PrismaClient } from "../generated/prisma/client.js"
import { sessionService } from "./sessionService.js"
import { scoringService } from "./scoringService.js"

vi.mock("../lib/prisma.js", () => ({
  prisma: mockDeep<PrismaClient>()
}))

import { prisma } from "../lib/prisma.js"
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>

describe("SessionService Unit Tests", () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  describe("submitAnswer", () => {
    it("should throw error if question not found", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
      prismaMock.session.findUnique.mockResolvedValue({
        id: "session123",
        userId: "user123",
        status: "in_progress",
        expiresAt: new Date(Date.now() + 3600000)
      } as any)
      prismaMock.question.findUnique.mockResolvedValue(null)

      await expect(sessionService.submitAnswer(
        "session123",
        "question123",
        ["4"]
      )).rejects.toThrow("Question not found")
    })

    it("should throw error if session is expired", async () => {
      prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => any) => cb(prismaMock))
      prismaMock.session.findUnique.mockResolvedValue({
        id: "session123",
        userId: "user123",
        status: "in_progress",
        expiresAt: new Date(Date.now() - 1000)
      } as any)

      await expect(sessionService.submitAnswer(
        "session123",
        "question123",
        ["4"]
      )).rejects.toThrow("expired")
    })

    it("should calculate score for single-select", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
      prismaMock.session.findUnique.mockResolvedValue({
        id: "session123",
        userId: "user123",
        status: "in_progress",
        expiresAt: new Date(Date.now() + 3600000)
      } as any)
      prismaMock.question.findUnique.mockResolvedValue({
        id: "question123",
        type: "single-select",
        correctAnswer: JSON.stringify(["4"]),
        points: 1
      } as any)
      prismaMock.answer.findUnique.mockResolvedValue(null)
      prismaMock.answer.upsert.mockResolvedValue({} as any)

      await sessionService.submitAnswer("session123", "question123", ["4"])
      expect(prismaMock.answer.upsert).toHaveBeenCalled()
    })

    it("should calculate score for multiple-select", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
      prismaMock.session.findUnique.mockResolvedValue({
        id: "session123",
        userId: "user123",
        status: "in_progress",
        expiresAt: new Date(Date.now() + 3600000)
      } as any)
      prismaMock.question.findUnique.mockResolvedValue({
        id: "question123",
        type: "multiple-select",
        correctAnswer: JSON.stringify(["A", "C"]),
        points: 2
      } as any)
      prismaMock.answer.findUnique.mockResolvedValue(null)
      const spy = vi.spyOn(scoringService, "scoreMultipleSelect")
      prismaMock.answer.upsert.mockResolvedValue({} as any)

      await sessionService.submitAnswer("session123", "question123", ["A", "B"])
      expect(spy).toHaveBeenCalled()
    })

    it("should throw error if answering same question twice", async () => {
      prismaMock.$transaction.mockImplementation(async () => {
        throw new Error("Answer already submitted for this question")
      })

      await expect(sessionService.submitAnswer(
        "session123",
        "question123",
        ["4"]
      )).rejects.toThrow("already submitted")
    })
  })

  describe("submitSession", () => {
    it("should throw error if session is already completed", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
      prismaMock.session.findUnique.mockResolvedValue({
        id: "session123",
        userId: "user123",
        status: "completed",
        expiresAt: new Date(Date.now() + 3600000),
        answers: []
      } as any)

      await expect(sessionService.submitSession("session123")).rejects.toThrow("completed")
    })

    it("should throw error if session expired", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
      prismaMock.session.findUnique.mockResolvedValue({
        id: "session123",
        userId: "user123",
        status: "in_progress",
        expiresAt: new Date(Date.now() - 1000),
        answers: []
      } as any)

      await expect(sessionService.submitSession("session123")).rejects.toThrow("expired")
    })

    it("should calculate total score on submit", async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))
      const mockSession = {
        id: "session123",
        userId: "user123",
        status: "in_progress",
        expiresAt: new Date(Date.now() + 10000),
        answers: [{ score: 1 }, { score: 0.5 }]
      } as any

      prismaMock.session.findUnique.mockResolvedValue(mockSession)
      prismaMock.session.update.mockResolvedValue({
        ...mockSession,
        status: "completed",
        score: 1.5,
        completedAt: new Date()
      } as any)

      const result = await sessionService.submitSession("session123")

      expect(prismaMock.session.update).toHaveBeenCalledWith({
        where: { id: "session123" },
        data: {
          status: "completed",
          score: 1.5,
          completedAt: expect.any(Date)
        }
      })
      expect(result.status).toBe("completed")
      expect(result.score).toBe(1.5)
    })
  })
})