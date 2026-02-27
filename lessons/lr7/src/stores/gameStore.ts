import { makeAutoObservable } from 'mobx';
import { Question, Answer, MultipleChoiceQuestion } from '../types/quiz';
import { mockQuestions } from '../data/questions';

export class GameStore {
  gameStatus: 'idle' | 'playing' | 'finished' = 'idle';
  questions: Question[] = [];
  currentQuestionIndex = 0;
  score = 0;
  selectedAnswers: number[] = [];
  textAnswer = '';
  answeredQuestions: Answer[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  startGame() {
    this.gameStatus = 'playing';
    this.questions = mockQuestions;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.selectedAnswers = [];
    this.textAnswer = '';
    this.answeredQuestions = [];
  }

  setGameStatus(status: 'idle' | 'playing' | 'finished') {
    this.gameStatus = status;
  }

  finishGame() {
    this.gameStatus = 'finished';
  }

  resetGame() {
    this.gameStatus = 'idle';
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.selectedAnswers = [];
    this.textAnswer = '';
    this.answeredQuestions = [];
  }

  toggleAnswer(answerIndex: number) {
    const index = this.selectedAnswers.indexOf(answerIndex);
    if (index > -1) {
      this.selectedAnswers = this.selectedAnswers.filter(i => i !== answerIndex);
    } else {
      this.selectedAnswers = [...this.selectedAnswers, answerIndex];
    }
  }

  setTextAnswer(text: string) {
    this.textAnswer = text;
  }

  saveCurrentAnswer() {
    const currentQuestion = this.currentQuestion;
    if (!currentQuestion) return;

    const answer: Answer = {
      questionId: currentQuestion.id,
      isCorrect: false,
      selectedAnswers: undefined,
      textAnswer: undefined,
    };

    if (currentQuestion.type === 'multiple') {
      answer.selectedAnswers = this.selectedAnswers;
      answer.isCorrect = this.selectedAnswers.every(idx =>
        (currentQuestion as MultipleChoiceQuestion).correctAnswers.includes(idx)
      );
    } else if (currentQuestion.type === 'essay') {
      answer.textAnswer = this.textAnswer;
      answer.isCorrect = true;
    }

    this.answeredQuestions.push(answer);
  }

  resetCurrentAnswer() {
    this.selectedAnswers = [];
    this.textAnswer = '';
  }

  setQuestionsFromAPI(questions: Question[]) {
    this.questions = questions;
  }

  nextQuestion() {
    if (this.isLastQuestion) {
      this.finishGame();
    } else {
      this.currentQuestionIndex += 1;
      this.resetCurrentAnswer();
    }
  }

  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get progress(): number {
    if (this.questions.length === 0) return 0;
    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }

  get correctAnswersCount(): number {
    return this.answeredQuestions.filter(answer => answer.isCorrect).length;
  }

  get isPlaying(): boolean {
    return this.gameStatus === 'playing';
  }

  get answers(): Answer[] {
    return this.answeredQuestions;
  }
}

export const gameStore = new GameStore();
