import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './index.js'
import { syncQuestionsFromAPI } from './services/questionSyncService.js'

serve({
  fetch: app.fetch,
  port: 3000
}, async (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
  await syncQuestionsFromAPI()
})
