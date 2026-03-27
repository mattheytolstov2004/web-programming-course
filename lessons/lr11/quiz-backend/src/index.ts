import { Hono } from 'hono'
import { serve } from '@hono/node-server'

import authRoute from './routes/auth.js'
import sessionsRoute from './routes/sessions.js'
import adminRoute from './routes/admin.js'

const app = new Hono()

app.route('/api/auth', authRoute)
app.route('/api/sessions', sessionsRoute)
app.route('/api/admin', adminRoute)

serve({
  fetch: app.fetch,
  port: 3000
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})