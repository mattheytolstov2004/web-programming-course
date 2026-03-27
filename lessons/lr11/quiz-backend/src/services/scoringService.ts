export class ScoringService {
  /**
   * Multiple-select scoring
   * результат нормализуется от 0 до 1
   */
  scoreMultipleSelect(
    correctAnswers: string[],
    studentAnswers: string[]
  ): number {
    if (correctAnswers.length === 0) return 0

    const correctSet = new Set(correctAnswers)

    let correctCount = 0
    let wrongCount = 0

    for (const answer of studentAnswers) {
      if (correctSet.has(answer)) {
        correctCount++
      } else {
        wrongCount++
      }
    }

    let score = correctCount - wrongCount * 0.5

    if (score < 0) score = 0

    const normalized = score / correctAnswers.length

    return Math.min(1, normalized)
  }

  /**
   * Essay scoring
   */
  scoreEssay(grades: number[], rubric: number[]): number {
    if (grades.length !== rubric.length) {
      throw new Error("Grades and rubric length mismatch")
    }

    let total = 0

    for (let i = 0; i < grades.length; i++) {
      const grade = grades[i]
      const max = rubric[i]

      if (grade < 0 || grade > max) {
        throw new Error(`Invalid grade ${grade} for max ${max}`)
      }

      total += grade
    }

    return total
  }
}

export const scoringService = new ScoringService()