import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import notificationService from '~/services/notifications.service'

export const useNotifications = (filter = 'all') => {
  return useInfiniteQuery({
    queryKey: ['NOTIFICATIONS', filter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await notificationService.getNotifications(pageParam, 10, filter)
      return response.data.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage && lastPage.hasMore) {
        return pages.length + 1
      }
      return undefined
    },
    select: (data) => {
      return {
        pages: data.pages.map(page => ({
          notifications: page?.notifications || [],
          hasMore: page?.hasMore || false
        })),
        pageParams: data.pageParams
      }
    }
  })
}

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
    },
    onError: () => {
      toast.error('Không thể đánh dấu thông báo đã đọc')
    }
  })
}

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      toast.success('Đã đánh dấu tất cả thông báo đã đọc')
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
    },
    onError: () => {
      toast.error('Không thể đánh dấu tất cả thông báo đã đọc')
    }
  })
}

export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
    },
    onError: () => {
      toast.error('Không thể xóa thông báo')
    }
  })
}

export const useDeleteAllNotificationsMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => notificationService.deleteAllNotifications(),
    onSuccess: () => {
      toast.success('Đã xóa tất cả thông báo')
      queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
    },
    onError: () => {
      toast.error('Không thể xóa tất cả thông báo')
    }
  })
}


