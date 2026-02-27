import { Question } from '../types/quiz';

export const mockQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple',
    question: 'Что выведет console.log(typeof null)?',
    options: ['null', 'undefined', 'object', 'number'],
    correctAnswers: [2],
    difficulty: 'easy',
  },
  {
    id: 2,
    type: 'multiple',
    question: 'Какой метод НЕ изменяет исходный массив?',
    options: ['push()', 'pop()', 'map()', 'sort()'],
    correctAnswers: [2],
    difficulty: 'medium',
  },
  {
    id: 3,
    type: 'essay',
    question: 'Объясните, что такое замыкание (closure).',
    minLength: 10,
    maxLength: 200,
    difficulty: 'hard',
  },
  {
    id: 4,
    type: 'multiple',
    question: "Чему равно '2' + 2?",
    options: ["'22'", '4', 'NaN', 'Error'],
    correctAnswers: [0],
    difficulty: 'easy',
  },
];
