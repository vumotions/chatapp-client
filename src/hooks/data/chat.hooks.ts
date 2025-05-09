import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from '~/i18n/navigation'
import conversationsService from '~/services/conversations.service'
import { useSocket } from '~/hooks/use-socket'
import { useSession } from 'next-auth/react'
import { useState, useRef } from 'react'

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

export const useChatList = (filter = 'all', searchQuery = '') => {
  return useInfiniteQuery({
    queryKey: ['CHAT_LIST', filter, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      return conversationsService.getConversations(pageParam, 10, filter, searchQuery)
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

// Thêm hook để xóa tin nhắn với khả năng hoàn tác
export const useDeleteMessage = (chatId: string) => {
  const queryClient = useQueryClient()
  const { socket } = useSocket() // Lấy socket từ hook useSocket
  const { data: session } = useSession() // Lấy thông tin session
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hàm để xóa tin nhắn với khả năng hoàn tác
  const deleteWithUndo = (messageId: string) => {
    // Lưu ID tin nhắn đang chờ xóa
    setPendingDeletion(messageId)
    
    // Cập nhật UI ngay lập tức để ẩn tin nhắn
    queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
      if (!oldData) return oldData
      
      // Đánh dấu tin nhắn là "đang chờ xóa" thay vì xóa hoàn toàn
      const updatedPages = oldData.pages.map((page: any) => {
        if (!page.messages) return page
        
        const updatedMessages = page.messages.map((msg: any) => {
          if (msg._id === messageId) {
            return {
              ...msg,
              pendingDeletion: true // Đánh dấu tin nhắn đang chờ xóa
            }
          }
          return msg
        })
        
        return {
          ...page,
          messages: updatedMessages
        }
      })
      
      return {
        ...oldData,
        pages: updatedPages
      }
    })
    
    // Hiển thị toast với nút hoàn tác
    toast.promise(
      new Promise((resolve, reject) => {
        // Lưu promise resolve/reject để có thể gọi từ nút hoàn tác
        const timeoutId = setTimeout(() => {
          // Thực hiện xóa sau 5 giây nếu không hoàn tác
          conversationsService.deleteMessage(messageId)
            .then(data => {
              setPendingDeletion(null)
              resolve(data)
            })
            .catch(error => {
              // Khôi phục tin nhắn nếu xóa thất bại
              setPendingDeletion(null)
              undoDelete(messageId)
              reject(error)
            })
        }, 5000) // Đợi 5 giây trước khi thực sự xóa
        
        // Lưu timeout ID để có thể hủy nếu cần
        timeoutRef.current = timeoutId
      }),
      {
        loading: 'Đang xóa tin nhắn...',
        success: 'Đã xóa tin nhắn',
        error: 'Không thể xóa tin nhắn',
        duration: 5000, // Hiển thị toast trong 5 giây
        action: {
          label: 'Hoàn tác',
          onClick: () => undoDelete(messageId)
        }
      }
    )
  }
  
  // Hàm để hoàn tác việc xóa
  const undoDelete = (messageId: string) => {
    // Hủy timeout nếu có
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    // Khôi phục tin nhắn trong UI
    queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
      if (!oldData) return oldData
      
      // Bỏ đánh dấu "đang chờ xóa"
      const updatedPages = oldData.pages.map((page: any) => {
        if (!page.messages) return page
        
        const updatedMessages = page.messages.map((msg: any) => {
          if (msg._id === messageId) {
            const { pendingDeletion, ...rest } = msg
            return rest // Loại bỏ thuộc tính pendingDeletion
          }
          return msg
        })
        
        return {
          ...page,
          messages: updatedMessages
        }
      })
      
      return {
        ...oldData,
        pages: updatedPages
      }
    })
    
    // Đặt lại trạng thái
    setPendingDeletion(null)
    
    // Hiển thị thông báo hoàn tác thành công
    toast.success('Đã hoàn tác xóa tin nhắn')
  }
  
  // Trả về mutation và các hàm bổ sung
  return {
    deleteWithUndo,
    undoDelete,
    pendingDeletion,
    // Vẫn giữ mutation gốc cho các trường hợp cần xóa ngay lập tức
    mutation: useMutation({
      mutationFn: (messageId: string) => conversationsService.deleteMessage(messageId),
      onSuccess: (_, messageId) => {
        // Hiển thị toast chỉ cho người xóa
        toast.success('Đã xóa tin nhắn')
      },
      onError: () => {
        toast.error('Không thể xóa tin nhắn')
      }
    })
  }
}

// Thêm hook để chỉnh sửa tin nhắn
export const useEditMessage = (chatId: string) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    // Sử dụng editMessage thay vì updateMessage
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) => {
      console.log('Calling editMessage with:', messageId, content)
      return conversationsService.editMessage(messageId, content)
    },
    onSuccess: (data, variables) => {
      console.log('Message edited successfully:', data, variables)
      
      // Cập nhật cache ngay lập tức để người dùng thấy thay đổi
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData
        
        // Tìm và cập nhật tin nhắn trong tất cả các trang
        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page
          
          const updatedMessages = page.messages.map((msg: any) => {
            if (msg._id === variables.messageId) {
              console.log('Updating message in cache:', variables.messageId)
              return {
                ...msg,
                content: variables.content,
                isEdited: true
              }
            }
            return msg
          })
          
          return {
            ...page,
            messages: updatedMessages
          }
        })
        
        return {
          ...oldData,
          pages: updatedPages
        }
      })
      
      // Hiển thị toast chỉ cho người cập nhật
      toast.success('Đã cập nhật tin nhắn')
    },
    onError: (error) => {
      console.error('Failed to update message:', error)
      toast.error('Không thể cập nhật tin nhắn')
    }
  })
}
