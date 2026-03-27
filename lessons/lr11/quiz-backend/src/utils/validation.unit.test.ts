import { describe, it, expect } from 'vitest'
import { AnswerSchema, QuestionSchema, GradeSchema, githubCallbackSchema } from './validation.js'

describe('Validation', () => {

  describe('AnswerSchema', () => {
    it('valid payload with string answer passes (single-select)', () => {
      const payload = {
        questionId: 'q1',
        answer: 'A'  // строка для single-select
      }

      const result = AnswerSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('valid payload with array answer passes (multiple-select)', () => {
      const payload = {
        questionId: 'q1',
        answer: ['A', 'B']  // массив для multiple-select
      }

      const result = AnswerSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('missing questionId fails', () => {
      const payload = {
        answer: ['A']
      }

      const result = AnswerSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('empty string answer fails', () => {
      const payload = {
        questionId: 'q1',
        answer: ''
      }

      const result = AnswerSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('empty array answer fails', () => {
      const payload = {
        questionId: 'q1',
        answer: []
      }

      const result = AnswerSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('number answer fails', () => {
      const payload = {
        questionId: 'q1',
        answer: 42
      }

      const result = AnswerSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('QuestionSchema', () => {
    it('valid single-select question passes', () => {
      const payload = {
        text: 'What is 2+2?',
        type: 'single-select',
        categoryId: 'cat1',
        correctAnswer: ['4'],
        points: 5
      }

      const result = QuestionSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('valid multiple-select question passes', () => {
      const payload = {
        text: 'Which are prime?',
        type: 'multiple-select',
        categoryId: 'cat1',
        correctAnswer: ['2', '3', '5'],
        points: 5
      }

      const result = QuestionSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('valid essay question passes (correctAnswer optional)', () => {
      const payload = {
        text: 'Write an essay',
        type: 'essay',
        categoryId: 'cat1',
        points: 10
      }

      const result = QuestionSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('missing text fails', () => {
      const payload = {
        type: 'single-select',
        categoryId: 'cat1',
        correctAnswer: ['4'],
        points: 5
      }

      const result = QuestionSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('invalid type fails', () => {
      const payload = {
        text: 'Question',
        type: 'invalid',
        categoryId: 'cat1',
        correctAnswer: ['4'],
        points: 5
      }

      const result = QuestionSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('points less than 1 fails', () => {
      const payload = {
        text: 'Question',
        type: 'single-select',
        categoryId: 'cat1',
        correctAnswer: ['4'],
        points: 0
      }

      const result = QuestionSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('GradeSchema', () => {
    it('valid grade with feedback passes', () => {
      const payload = {
        score: 8,
        feedback: 'Good job!'
      }

      const result = GradeSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('valid grade without feedback passes', () => {
      const payload = {
        score: 8
      }

      const result = GradeSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('score less than 0 fails', () => {
      const payload = {
        score: -1
      }

      const result = GradeSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('score greater than 100 fails', () => {
      const payload = {
        score: 101
      }

      const result = GradeSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('githubCallbackSchema', () => {
    it('valid code passes', () => {
      const payload = {
        code: 'abc123'
      }

      const result = githubCallbackSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('empty code fails', () => {
      const payload = {
        code: ''
      }

      const result = githubCallbackSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('missing code fails', () => {
      const payload = {}

      const result = githubCallbackSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })
})