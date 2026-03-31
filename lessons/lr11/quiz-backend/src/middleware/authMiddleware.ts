import type { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import { prisma } from '../db/prisma.js'

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    return c.json({ error: 'JWT_SECRET not configured' }, 500)
  }

  try {
    const payload = await verify(token, jwtSecret, 'HS256')
    const userId = payload.sub as string

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    c.set('user', user)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}