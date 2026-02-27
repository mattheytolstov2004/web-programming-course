import type { Answer } from '../types/quiz'

export function calculateScore(answers: Answer[]): number {
  return answers.reduce(
    (total, a) => total + (a.pointsEarned ?? (a.isCorrect ? 1 : 0)),
    0
  )
}
