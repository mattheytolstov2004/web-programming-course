import { describe, it, expect } from 'vitest'
import { calculateScore } from './score'
import type { Answer } from '../types/quiz'

describe('calculateScore', () => {
  it('counts points correctly', () => {
    const answers: Answer[] = [
      { questionId: 1, isCorrect: true, pointsEarned: 3 },
      { questionId: 2, isCorrect: false, pointsEarned: 0 },
      { questionId: 3, isCorrect: true }, // default 1 point
    ]
    expect(calculateScore(answers)).toBe(4)
  })
})
