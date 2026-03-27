import { z } from "zod"

export const githubCallbackSchema = z.object({
  code: z.string().min(1)
})

export const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.union([  // Проверьте, что здесь именно union
    z.string().min(1),
    z.array(z.string()).min(1)
  ])
})

export const GradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().optional()
})

export const QuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["single-select", "multiple-select", "essay"]),
  points: z.number().min(1).optional(),
  categoryId: z.string().optional(),
  correctAnswer: z.array(z.string()).optional()
})