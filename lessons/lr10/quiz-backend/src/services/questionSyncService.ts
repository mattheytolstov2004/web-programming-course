import { prisma } from '../lib/prisma.js'

const EXTERNAL_API = process.env.EXTERNAL_API_URL ?? 'http://localhost:3001'

type ExternalQuestion = {
  id: string
  type: 'single-select' | 'multiple-select' | 'essay'
  question: string
  categoryId?: string
  difficulty?: string
  maxPoints?: number
  options?: string[]
  minLength?: number
  maxLength?: number
}

type ExternalCategory = {
  id: string
  name: string
  slug: string
}

async function getExternalToken(): Promise<string | null> {
  try {
    const res = await fetch(`${EXTERNAL_API}/api/auth/github/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'admin_sync' }), // admin_ префикс
    })
    if (!res.ok) return null
    const data = await res.json() as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

async function fetchExternalCategories(token: string): Promise<ExternalCategory[]> {
  try {
    const res = await fetch(`${EXTERNAL_API}/api/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json() as { categories: ExternalCategory[] }
    return data.categories ?? []
  } catch {
    return []
  }
}

async function fetchExternalQuestions(token: string): Promise<ExternalQuestion[]> {
  try {
    // Используем admin endpoint — не скрывает вопросы в battle mode
    const res = await fetch(`${EXTERNAL_API}/api/admin/questions?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json() as { questions: ExternalQuestion[] }
    return data.questions ?? []
  } catch {
    return []
  }
}

// Синхронизация при старте сервера
export async function syncQuestionsFromAPI(): Promise<void> {
  console.log('🔄 Синхронизация вопросов с внешнего API...')

  const token = await getExternalToken()
  if (!token) {
    console.warn('⚠️  Не удалось получить токен — синхронизация пропущена')
    return
  }

  // Категории
  const categories = await fetchExternalCategories(token)
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { slug: cat.slug, name: cat.name },
    })
  }
  if (categories.length > 0) {
    console.log(`✅ Категорий синхронизировано: ${categories.length}`)
  }

  // Вопросы (только в game mode, в battle mode API скрывает их)
  const questions = await fetchExternalQuestions(token)
  if (questions.length === 0) {
    console.warn('⚠️  Вопросы недоступны (battle mode?) — используем вопросы из БД')
    return
  }

  let synced = 0
  for (const q of questions) {
    const categorySlug = q.categoryId ?? 'default'
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } })
    if (!cat) continue

    await prisma.question.upsert({
      where: { id: q.id },
      update: { text: q.question, type: q.type, points: q.maxPoints ?? 1 },
      create: {
        id: q.id,
        text: q.question,
        type: q.type,
        categoryId: cat.id,
        points: q.maxPoints ?? 1,
      },
    })
    synced++
  }

  console.log(`✅ Вопросов синхронизировано: ${synced}`)
}

// Получить N случайных вопросов из БД
export async function getRandomQuestions(count: number = 10, categoryId?: string) {
  const where = categoryId ? { category: { slug: categoryId } } : {}
  const all = await prisma.question.findMany({ where })
  if (all.length === 0) return []
  const shuffled = all.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, all.length))
}
