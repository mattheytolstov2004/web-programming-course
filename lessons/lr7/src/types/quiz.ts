export interface BaseQuestion {
  id: string | number;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple';
  options: string[];
  correctAnswers: number[]; // индексы правильных ответов
}

export interface EssayQuestionType extends BaseQuestion {
  type: 'essay';
  minLength?: number;
  maxLength?: number;
}

export type Question = MultipleChoiceQuestion | EssayQuestionType;

export interface Answer {
  questionId: string | number;
  selectedAnswers?: number[];
  textAnswer?: string;
  isCorrect: boolean;
  pointsEarned?: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type Theme = 'light' | 'dark';
