import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import notificationService from '~/services/notifications.service'

export const useNotificationsQuery = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      console.log('Fetching notifications...');
      const response = await notificationService.getNotifications();
      console.log('Notifications response:', response.data);
      return response.data;
    },
    select: (res) => {
      console.log('Processing notifications data:', res.data);
      return res.data;
    }
  });
};

export const useMarkNotificationAsReadMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => {
      toast.error('Không thể đánh dấu thông báo đã đọc')
    }
  })
}

export const useMarkAllNotificationsAsReadMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      toast.success('Đã đánh dấu tất cả thông báo đã đọc')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => {
      toast.error('Không thể đánh dấu tất cả thông báo đã đọc')
    }
  })
}
