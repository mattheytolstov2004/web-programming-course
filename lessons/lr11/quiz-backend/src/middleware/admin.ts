import type { Context, Next } from 'hono'
import { prisma } from '../db/prisma.js'

export const adminMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user')

  const dbUser = await prisma.user.findUnique({
    where: { id: user?.id },
  })

  if (!dbUser || dbUser.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await next()
}