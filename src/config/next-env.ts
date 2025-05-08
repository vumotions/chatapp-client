import { z } from 'zod'

const nextEnvSchema = z.object({
  NEXT_PUBLIC_SERVER_URL: z.string().default(''),
  NEXTAUTH_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  NEXT_PUBLIC_HASH_SECRET: z.string().default(''),
  NEXTAUTH_URL: z.string().default(''),
  NEXTAUTH_URL_INTERNAL: z.string().default(''),
  NEXT_PUBLIC_URL_INTERNAL: z.string().default('')
})

const nextEnv = nextEnvSchema.parse({
  NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_HASH_SECRET: process.env.NEXT_PUBLIC_HASH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL,
  NEXT_PUBLIC_URL_INTERNAL: process.env.NEXT_PUBLIC_URL_INTERNAL
})

export default nextEnv
