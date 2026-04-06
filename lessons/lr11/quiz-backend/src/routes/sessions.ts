import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { sessionService } from '../services/sessionService.js'
import { getRandomQuestions } from '../services/questionSyncService.js'
import {
  answerSchema,
  createSessionSchema,
  paginationSchema,
  toPrismaPage,
} from '../utils/validation.js'
import {
  SessionNotFoundError,
  SessionExpiredError,
  SessionAlreadyCompletedError,
  QuestionNotFoundError,
  DuplicateAnswerError,
} from '../services/sessionService.js'
import { prisma } from '../lib/prisma.js'

const sessions = new Hono()

sessions.use('*', authMiddleware)

function getUserId(c: Parameters<typeof authMiddleware>[0]): string {
  const payload = c.get('jwtPayload') as { userId: string }
  return payload.userId
}

sessions.post('/', async c => {
  let body: unknown = {}
  try { body = await c.req.json() } catch { /* пустое тело */ }

  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400)
  }

  const userId = getUserId(c)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return c.json({ error: 'User not found' }, 404)

  // Берём 10 случайных вопросов из своей БД
  const questions = await getRandomQuestions(10, parsed.data.categoryId)
  if (questions.length === 0) {
    return c.json({ error: 'No questions available. Try again later.' }, 503)
  }

  const questionIds = questions.map(q => q.id)

  // Создаём сессию с сохранёнными questionIds
  const session = await sessionService.createSession(userId, questionIds)

  // Загружаем вопросы с категориями для ответа
  const fullQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { category: true },
  })

  // Сортируем в том же порядке что и questionIds
  const orderedQuestions = questionIds.map(id => fullQuestions.find(q => q.id === id)!)

  const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

  return c.json(
    {
      sessionId: session.id,
      userId: session.userId,
      status: 'active',
      // Массив вопросов с индексами
      questions: orderedQuestions.map((q, index) => ({
        index,                    // порядковый номер вопроса (0-based)
        id: q.id,
        type: q.type,
        question: q.text,
        categoryId: q.category.slug,
        maxPoints: q.points,
      })),
      totalQuestions: questionIds.length,
      answeredCount: 0,
      maxScore,
      currentScore: 0,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    },
    201,
  )
})

sessions.get('/', async c => {
  const userId = getUserId(c)

  const pagination = paginationSchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  })
  const { skip, take } = pagination.success ? toPrismaPage(pagination.data) : { skip: 0, take: 20 }

  const [items, total] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        status: true,
        score: true,
        questionIds: true,
        startedAt: true,
        expiresAt: true,
        completedAt: true,
        createdAt: true,
        _count: { select: { answers: true } },
      },
    }),
    prisma.session.count({ where: { userId } }),
  ])

  return c.json({
    sessions: items.map(s => {
      const ids = JSON.parse(s.questionIds ?? '[]') as string[]
      return { ...s, questionIds: ids, totalQuestions: ids.length }
    }),
    pagination: {
      total,
      page: pagination.success ? pagination.data.page : 1,
      limit: take,
      pages: Math.ceil(total / take),
    },
  })
})

sessions.get('/:id', async c => {
  const sessionId = c.req.param('id')
  const userId = getUserId(c)

  try {
    const session = await sessionService.getSession(sessionId, userId)
    const questionIds = JSON.parse(session.questionIds ?? '[]') as string[]

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { category: true },
    })

    // Сохраняем порядок вопросов
    const ordered = questionIds.map((id, index) => {
      const q = questions.find(q => q.id === id)!
      return { index, id: q.id, type: q.type, question: q.text, categoryId: q.category.slug, maxPoints: q.points }
    })

    return c.json({ session: { ...session, questionIds, totalQuestions: questionIds.length, questions: ordered } })
  } catch (err) {
    if (err instanceof SessionNotFoundError) return c.json({ error: err.message }, 404)
    throw err
  }
})

sessions.post('/:id/answers', async c => {
  const sessionId = c.req.param('id')
  const userId = getUserId(c)

  const ownership = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, questionIds: true },
  })
  if (!ownership) return c.json({ error: 'Session not found' }, 404)
  if (ownership.userId !== userId) return c.json({ error: 'Session not found' }, 404)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON body' }, 400) }

  const parsed = answerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400)
  }

  const { questionId, userAnswer } = parsed.data

  // Проверяем что вопрос входит в эту сессию
  const sessionQuestionIds = JSON.parse(ownership.questionIds ?? '[]') as string[]
  if (!sessionQuestionIds.includes(questionId)) {
    return c.json({ error: 'Question does not belong to this session' }, 400)
  }

  const questionIndex = sessionQuestionIds.indexOf(questionId)

  try {
    const answer = await sessionService.submitAnswer(sessionId, questionId, userAnswer)
    return c.json({
      answer,
      questionIndex,                           // порядковый номер (0-based)
      totalQuestions: sessionQuestionIds.length,
      isLast: questionIndex === sessionQuestionIds.length - 1,
    }, 201)
  } catch (err) {
    if (err instanceof SessionNotFoundError) return c.json({ error: err.message }, 404)
    if (err instanceof SessionExpiredError) return c.json({ error: err.message }, 410)
    if (err instanceof SessionAlreadyCompletedError) return c.json({ error: err.message }, 409)
    if (err instanceof QuestionNotFoundError) return c.json({ error: err.message }, 404)
    if (err instanceof DuplicateAnswerError) return c.json({ error: err.message }, 409)
    throw err
  }
})

sessions.post('/:id/submit', async c => {
  const sessionId = c.req.param('id')
  const userId = getUserId(c)

  const ownership = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, questionIds: true },
  })
  if (!ownership) return c.json({ error: 'Session not found' }, 404)
  if (ownership.userId !== userId) return c.json({ error: 'Session not found' }, 404)

  try {
    const session = await sessionService.submitSession(sessionId)
    const questionIds = JSON.parse(session.questionIds ?? '[]') as string[]
    return c.json({ session: { ...session, questionIds, totalQuestions: questionIds.length } })
  } catch (err) {
    if (err instanceof SessionNotFoundError) return c.json({ error: err.message }, 404)
    if (err instanceof SessionExpiredError) return c.json({ error: err.message }, 410)
    if (err instanceof SessionAlreadyCompletedError) return c.json({ error: err.message }, 409)
    throw err
  }
})

export default sessions
