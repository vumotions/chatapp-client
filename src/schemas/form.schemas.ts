import { z } from 'zod'
import { emailRgx } from '~/constants/regex'

export const formCodeSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  otp: z.string().regex(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits'
  })
})

export type FormCodeValues = z.infer<typeof formCodeSchema>

export const formLoginSchema = z.object({
  email: z.string().min(1, 'Email is required').regex(emailRgx, 'Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false)
})

export type FormLoginValues = z.infer<typeof formLoginSchema>

export const formRegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must not be longer than 50 characters'),
    email: z.string().min(1, 'Email is required').regex(emailRgx, 'Invalid email address'),
    day: z.string(),
    month: z.string(),
    year: z.string(),
    gender: z.enum(['male', 'female', 'other'], {
      message: 'Please select your gender'
    }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    dob: z.string().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword']
  })
  .refine((data) => data.day && data.month && data.year, {
    message: 'Please complete your date of birth',
    path: ['dob']
  })

export type FormRegisterValues = z.infer<typeof formRegisterSchema>
