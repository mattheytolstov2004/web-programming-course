import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { prisma } from '../db/prisma.js'
import { getGitHubUserByCode } from '../services/github.js'
import { githubCallbackSchema } from '../utils/validation.js'

const authRoute = new Hono()


authRoute.get('/github', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = 'http://localhost:3000/api/auth/github/callback'
  
  if (!clientId) {
    return c.json({ error: 'GITHUB_CLIENT_ID not configured' }, 500)
  }
  
  // Перенаправляем пользователя на GitHub для авторизации
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`
  
  return c.redirect(githubAuthUrl)
})

// GitHub OAuth callback (уже есть)
authRoute.get('/github/callback', async (c) => {
  try {
    const code = c.req.query('code')
    
    if (!code) {
      return c.json({ error: 'No code provided' }, 400)
    }

    const githubUser = await getGitHubUserByCode(code)
    
    // Получаем email из GitHub пользователя
    const email = githubUser.email ?? `${githubUser.id}@users.noreply.github.com`
    const name = githubUser.name ?? null
    const githubId = String(githubUser.id)

    // Создаем или обновляем пользователя в базе данных
    const user = await prisma.user.upsert({
      where: { githubId },
      update: { email, name },
      create: { githubId, email, name },
    })

    // Создаем JWT токен
    const now = Math.floor(Date.now() / 1000)
    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        iat: now,
        exp: now + 60 * 60 * 24, // 24 часа
      },
      process.env.JWT_SECRET as string
    )

    // Возвращаем токен и данные пользователя
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

// Get current user (JWT protected) - уже есть
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