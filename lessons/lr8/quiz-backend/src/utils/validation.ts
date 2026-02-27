import { z } from 'zod'

export const githubCallbackSchema = z.object({
  code: z.string().min(1, 'code is required')
})

export type GitHubCallbackInput = z.infer<typeof githubCallbackSchema>