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
  getNotifications(page = 1, limit = 10, filter = 'all', excludeTypes = ['NEW_MESSAGE']) {
    const excludeTypesParam = excludeTypes.length > 0 ? `&excludeTypes=${excludeTypes.join(',')}` : ''
    return httpRequest.get<SuccessResponse<NotificationsResponse>>(
      `/notifications?page=${page}&limit=${limit}&filter=${filter}${excludeTypesParam}`
    )
  }

  markAsRead(notificationId: string) {
    return httpRequest.patch<SuccessResponse<Notification>>(`/notifications/${notificationId}/read`)
  }

  markAllAsRead() {
    return httpRequest.patch<SuccessResponse<null>>('/notifications/read-all')
  }

  deleteNotification(notificationId: string) {
    return httpRequest.delete<SuccessResponse<null>>(`/notifications/${notificationId}`)
  }

  deleteAllNotifications() {
    return httpRequest.delete<SuccessResponse<null>>('/notifications')
  }
}

const notificationsService = new NotificationsService()
export default notificationsService
