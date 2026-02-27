import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { gameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import {
  usePostApiSessions,
  usePostApiSessionsSessionIdAnswers,
  usePostApiSessionsSessionIdSubmit,
} from '../../generated/api/sessions/sessions'

import type {
  Question,
  MultipleChoiceQuestion,
  EssayQuestionType,
} from '../types/quiz'

import { MultipleSelectQuestion } from '../components/quiz/MultipleSelectQuestion'
import { EssayQuestion } from '../components/quiz/EssayQuestion'

const Task4 = observer(() => {
  const [sessionId, setSessionId] = useState<string | null>(null)

  const createSession = usePostApiSessions()
  const submitAnswer = usePostApiSessionsSessionIdAnswers()
  const submitSession = usePostApiSessionsSessionIdSubmit()

  const {
    gameStatus,
    currentQuestion,
    selectedAnswers,
    textAnswer,
    currentQuestionIndex,
    questions,
  } = gameStore

  const theme = useUIStore(state => state.theme)
  const toggleTheme = useUIStore(state => state.toggleTheme)

  const bgGradient =
    theme === 'light'
      ? 'from-purple-500 to-indigo-600'
      : 'from-gray-900 to-black'

  const cardBg = theme === 'light' ? 'bg-white' : 'bg-gray-800'
  const textColor = theme === 'light' ? 'text-gray-800' : 'text-white'
  const primaryColor = theme === 'light' ? 'bg-purple-600' : 'bg-purple-700'
  const primaryHover =
    theme === 'light' ? 'hover:bg-purple-700' : 'hover:bg-purple-800'

  const handleStartGame = () => {
    createSession.mutate(
      { data: {} },
      {
        onSuccess: response => {
          setSessionId(response.sessionId)

          const questions: Question[] = response.questions.map(q => {
            if (q.options && q.options.length > 0) {
              const multiple: MultipleChoiceQuestion = {
                id: q.id,
                type: 'multiple',
                question: q.question,
                options: q.options,
                correctAnswers: [],
                difficulty: q.difficulty,
              }
              return multiple
            } else {
              const essay: EssayQuestionType = {
                id: q.id,
                type: 'essay',
                question: q.question,
                minLength: 10,
                maxLength: 500,
                difficulty: q.difficulty,
              }
              return essay
            }
          })

          gameStore.setQuestionsFromAPI(questions)
          gameStore.setGameStatus('playing')
        },
      },
    )
  }

  const handleNextQuestion = () => {
    if (!sessionId || !currentQuestion) return

    const submissionData: {
      questionId: string
      selectedOptions?: number[]
      text?: string
    } = {
      questionId: String(currentQuestion.id),
    }

    if (currentQuestion.type === 'multiple') {
      submissionData.selectedOptions = selectedAnswers
    } else {
      submissionData.text = textAnswer
    }

    submitAnswer.mutate(
      { sessionId, data: submissionData },
      {
        onSettled: () => {
          gameStore.nextQuestion()
          gameStore.resetCurrentAnswer()
        },
      },
    )
  }

  const handleFinishGame = () => {
    if (!sessionId) {
      gameStore.finishGame()
      return
    }

    submitSession.mutate(
      { sessionId },
      {
        onSettled: () => gameStore.finishGame(),
      },
    )
  }

  const canProceed =
    currentQuestion?.type === 'multiple'
      ? selectedAnswers.length > 0
      : currentQuestion?.type === 'essay'
      ? textAnswer.trim().length >= (currentQuestion.minLength ?? 0)
      : false

  // ------------------- START SCREEN -------------------

  if (gameStatus === 'idle') {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center p-4`}
      >
        <div className={`${cardBg} w-full max-w-md rounded-2xl p-8 shadow-2xl`}>
          <div className="mb-4 flex justify-end">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 bg-gray-200 hover:bg-gray-300"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          <h1 className={`mb-4 text-center text-4xl font-bold ${textColor}`}>
            Quiz Game
          </h1>

          <button
            data-testid="start-button"
            onClick={handleStartGame}
            disabled={createSession.isPending}
            className={`w-full ${primaryColor} ${primaryHover} rounded-xl px-6 py-4 font-semibold text-white`}
          >
            {createSession.isPending ? 'Загрузка...' : 'Начать игру'}
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  // ------------------- GAME SCREEN -------------------

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4`}>
      <div className="mx-auto max-w-2xl">
        <div className={`${cardBg} rounded-2xl p-6 shadow-2xl`}>
          
          {/* Progress */}
          <p
            data-testid="progress"
            className={`mb-4 text-sm opacity-70 ${textColor}`}
          >
            {currentQuestionIndex + 1} из {questions.length}
          </p>

          <h2 className={`mb-6 text-2xl font-bold ${textColor}`}>
            {currentQuestion.question}
          </h2>

          {currentQuestion.type === 'multiple' && (
            <MultipleSelectQuestion
              question={currentQuestion}
              selectedAnswers={selectedAnswers}
              onToggleAnswer={index => gameStore.toggleAnswer(index)}
            />
          )}

          {currentQuestion.type === 'essay' && (
            <EssayQuestion
              question={currentQuestion}
              textAnswer={textAnswer}
              onTextChange={text => gameStore.setTextAnswer(text)}
            />
          )}

          {canProceed && (
            <button
              onClick={
                gameStore.isLastQuestion
                  ? handleFinishGame
                  : handleNextQuestion
              }
              disabled={
                submitAnswer.isPending || submitSession.isPending
              }
              className={`mt-6 w-full ${primaryColor} ${primaryHover} rounded-lg px-6 py-3 font-semibold text-white`}
            >
              {gameStore.isLastQuestion
                ? 'Завершить'
                : 'Следующий вопрос'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default Task4
