export interface SuccessResponse<T> {
  [x: string]: SuccessResponse<NotificationsResponse>
  message: string
  data: T
}

export interface ErrorResponse<T> {
  name?: string
  message: string
  errors?: T
}
