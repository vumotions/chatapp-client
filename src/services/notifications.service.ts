import httpRequest from '~/config/http-request'
import { SuccessResponse } from '~/types/api.types'

export interface Notification {
  _id: string
  userId: string
  senderId: {
    _id: string
    name: string
    avatar: string
  }
  type: string
  relatedId: string
  read: boolean
  createdAt: string
  updatedAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  hasMore: boolean
  totalPages: number
  currentPage: number
}

class NotificationsService {
  getNotifications(page = 1, limit = 10) {
    return httpRequest.get<SuccessResponse<NotificationsResponse>>(`/notifications?page=${page}&limit=${limit}`)
  }

  markAsRead(notificationId: string) {
    return httpRequest.patch<SuccessResponse<Notification>>(`/notifications/${notificationId}/read`)
  }

  markAllAsRead() {
    return httpRequest.patch<SuccessResponse<null>>('/notifications/read-all')
  }
}

const notificationsService = new NotificationsService()
export default notificationsService
