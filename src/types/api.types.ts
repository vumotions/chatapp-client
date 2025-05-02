export interface SuccessResponse<T> {
  message: string
  data: T
}

export interface ErrorResponse<T> {
  name?: string
  message: string
  errors?: T
}
