import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from '~/i18n/navigation'
import conversationsService from '~/services/conversations.service'

export const useMessages = (chatId: string) => {
  return useInfiniteQuery({
    queryKey: ['MESSAGES', chatId],
    queryFn: async ({ pageParam = 1 }) => {
      console.log('Fetching messages for page:', pageParam);
      const response = await conversationsService.getMessages(chatId, pageParam, 10);
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      console.log('Last page has more:', lastPage?.hasMore);
      if (lastPage && lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    enabled: !!chatId,
    staleTime: Infinity, // Đặt staleTime là Infinity để ngăn refetch tự động
    gcTime: Infinity, // Đặt gcTime là Infinity để giữ dữ liệu trong cache
  });
}

export const useChatList = () => {
  return useInfiniteQuery({
    queryKey: ['CHAT_LIST'],
    queryFn: async ({ pageParam = 1 }) => {
      return conversationsService.getConversations(pageParam, 10)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined
    },
    enabled: true
  })
}

export const useCreateConversation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: conversationsService.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    }
  })
}

export const useStartConversationMutation = () => {
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => conversationsService.createConversation([userId]),
    onSuccess: (conversation) => {
      if (conversation && conversation._id) {
        toast.success('Đã mở cuộc trò chuyện!')
        router.push(`/messages/${conversation._id}`)
      }
    },
    onError: () => {
      toast.error('Lỗi khi tạo cuộc trò chuyện')
    }
  })
}

export const useMarkChatAsRead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (chatId: string) => conversationsService.markChatAsRead(chatId),
    onSuccess: () => {
      // Invalidate chat list query để cập nhật UI
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    }
  })
}
