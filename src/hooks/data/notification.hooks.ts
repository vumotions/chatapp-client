import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import notificationService from '~/services/notifications.service'

export const useNotifications = () => {
  return useInfiniteQuery({
    queryKey: ['NOTIFICATIONS'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await notificationService.getNotifications(pageParam, 10)
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
      // Đảm bảo dữ liệu trả về luôn có cấu trúc đúng
      return {
        pages: data.pages.map(page => ({
          notifications: page?.notifications || [],
          hasMore: page?.hasMore || false,
          totalPages: page?.totalPages || 0,
          currentPage: page?.currentPage || 0
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


