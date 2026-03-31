import { Hono } from 'hono'

import authRoute from './routes/auth.js'
import sessionsRoute from './routes/sessions.js'
import adminRoute from './routes/admin.js'

export const app = new Hono()

app.route('/api/sessions', sessionsRoute)
app.route('/api/admin', adminRoute)
app.route('/api/auth', authRoute)

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})