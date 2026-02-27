import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { prisma } from '../db/prisma.js'
import { getGitHubUserByCode } from '../services/github.js'
import { githubCallbackSchema } from '../utils/validation.js'

const authRoute = new Hono()

// GitHub OAuth callback
authRoute.post('/github/callback', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = githubCallbackSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Invalid code' }, 400)
    }

    const githubUser = await getGitHubUserByCode(parsed.data.code)

    const email = githubUser.email ?? `${githubUser.id}@users.noreply.github.com`
    const name = githubUser.name ?? null
    const githubId = String(githubUser.id)

    const user = await prisma.user.upsert({
      where: { githubId },
      update: { email, name },
      create: { githubId, email, name },
    })

    const now = Math.floor(Date.now() / 1000)
    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        iat: now,
        exp: now + 60 * 60 * 24,
      },
      process.env.JWT_SECRET as string
    )

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubId: user.githubId,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'GitHubServiceError') {
      return c.json({ error: error.message }, 400)
    }

    console.error('GitHub callback failed:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get current user (JWT protected)
authRoute.get('/me', async (c) => {
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

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubId: user.githubId,
        createdAt: user.createdAt,
      },
    })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export default authRoute