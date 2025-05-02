import { toast } from 'sonner'
import { ZodIssue } from 'zod'
import { ErrorResponse } from '~/types/api.types'
import { isAxiosUnprocessableEntityError } from './utils'
import { UseFormReturn } from 'react-hook-form'

export const handleError = (error: any, form: UseFormReturn<any>) => {
  if (isAxiosUnprocessableEntityError<ErrorResponse<Record<string, ZodIssue>>>(error)) {
    const errors = error.response?.data.errors
    if (errors && form) {
      Object.keys(errors).forEach((key) => {
        form.setError(key, {
          type: 'custom',
        message: errors[key].message
        })
      })
    }
  } else {
    toast.error(error?.response?.message || 'Unexpected Server Error')
  }
}
