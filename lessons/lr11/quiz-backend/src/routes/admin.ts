import { Hono } from 'hono'
import { prisma } from '../db/prisma.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/admin.js'
import { QuestionSchema } from '../utils/validation.js'

const adminRoute = new Hono()

// корневой endpoint (для теста security)
adminRoute.get('/', authMiddleware, adminMiddleware, async (c) => {
  return c.json({ status: 'admin' })
})

// GET questions
adminRoute.get('/questions', authMiddleware, adminMiddleware, async (c) => {
  const questions = await prisma.question.findMany()
  return c.json({ questions })
})

export default adminRoute