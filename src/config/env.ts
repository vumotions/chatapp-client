import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NEXTAUTH_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default('')
})

const nextEnv = envSchema.parse(process.env)

export default nextEnv
