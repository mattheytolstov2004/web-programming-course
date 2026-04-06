import type { User } from '../generated/prisma/client.js'

declare module 'hono' {
  interface ContextVariableMap {
    user: User
  }
}