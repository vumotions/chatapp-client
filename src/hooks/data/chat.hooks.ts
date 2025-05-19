import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSocket } from '~/hooks/use-socket'
import { useRouter } from '~/i18n/navigation'
import conversationsService from '~/services/conversations.service'

export const useMessages = (chatId: string) => {
  return useInfiniteQuery({
    queryKey: ['MESSAGES', chatId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await conversationsService.getMessages(chatId, pageParam, 10)
      return response
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage && lastPage.hasMore) {
        return pages.length + 1
      }
      return undefined
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 5, // 5 phút
    gcTime: 1000 * 60 * 10, // 10 phút
    refetchOnWindowFocus: false, // Tắt refetch khi focus
    refetchInterval: false // Tắt polling tự động
  })
}

export const useChatList = (filter: string = '') => {
  return useInfiniteQuery({
    queryKey: ['CHAT_LIST', filter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await conversationsService.getConversations(pageParam, 10, filter)
      return response
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage && lastPage.hasMore) {
        return pages.length + 1
      }
      return undefined
    },
    staleTime: 1000 * 60 * 5, // 5 phút
    gcTime: 1000 * 60 * 5, // 5 phút
    refetchOnWindowFocus: false, // Tắt refetch khi focus
    refetchInterval: false // Tắt polling tự động
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
    onSuccess: (data) => {
      const conversation = data.conversation
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
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hàm để cập nhật cache khi xóa tin nhắn
  const updateCacheAfterDeletion = useCallback(
    (messageId: string) => {
      // 1. Cập nhật cache tin nhắn
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        // Lọc tin nhắn đã xóa khỏi tất cả các trang
        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const filteredMessages = page.messages.filter((msg: any) => msg._id !== messageId)

          return {
            ...page,
            messages: filteredMessages
          }
        })

        return {
          ...oldData,
          pages: updatedPages
        }
      })

      // 2. Cập nhật cache tin nhắn ghim
      queryClient.setQueryData(['PINNED_MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        // Lọc tin nhắn đã xóa khỏi danh sách tin nhắn ghim
        return oldData.filter((msg: any) => msg._id !== messageId)
      })

      // 3. Invalidate các query liên quan để đảm bảo dữ liệu được cập nhật
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['PINNED_MESSAGES', chatId] })
    },
    [queryClient, chatId]
  )

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

    // Hiển thị toast với nút hoàn tác và nút đóng
    const toastId = toast.loading('Đang xóa tin nhắn...', {
      duration: 5000,
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          toast.dismiss(toastId)
          undoDelete(messageId)
        }
      },
      cancel: {
        label: 'Xóa ngay',
        onClick: () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          toast.dismiss(toastId)
          confirmDelete(messageId)
        }
      },
      cancelButtonStyle: {
        backgroundColor: 'red',
        color: 'white'
      }
    })

    // Lưu timeout ID để có thể hủy nếu cần
    const timeoutId = setTimeout(() => {
      // Đóng toast trước khi thực hiện xóa
      toast.dismiss(toastId)
      // Thực hiện xóa sau 5 giây nếu không hoàn tác
      confirmDelete(messageId)
    }, 5000) // Đợi 5 giây trước khi thực sự xóa

    timeoutRef.current = timeoutId
  }

  // Hàm để xác nhận xóa tin nhắn ngay lập tức
  const confirmDelete = (messageId: string) => {
    // Thực hiện xóa ngay lập tức
    conversationsService
      .deleteMessage(messageId)
      .then((data) => {
        setPendingDeletion(null)
        toast.success('Đã xóa tin nhắn', { duration: 2000 })

        // Cập nhật cache sau khi xóa thành công
        updateCacheAfterDeletion(messageId)
      })
      .catch((error) => {
        // Khôi phục tin nhắn nếu xóa thất bại
        setPendingDeletion(null)
        undoDelete(messageId)
        toast.error('Không thể xóa tin nhắn')
      })
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

        // Cập nhật cache sau khi xóa thành công
        updateCacheAfterDeletion(messageId)
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
      return conversationsService.editMessage(messageId, content)
    },
    onSuccess: (data, variables) => {
      // Cập nhật cache ngay lập tức để người dùng thấy thay đổi
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        // Tìm và cập nhật tin nhắn trong tất cả các trang
        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            if (msg._id === variables.messageId) {
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

// Hook để xóa cuộc trò chuyện với khả năng hoàn tác
export const useDeleteConversation = () => {
  const queryClient = useQueryClient()
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const UNDO_TIMEOUT = 5000 // 5 giây
  const router = useRouter()

  // Hàm để xóa cuộc trò chuyện với khả năng hoàn tác
  const deleteWithUndo = (conversationId: string, isGroup: boolean = false, isOwner: boolean = false) => {
    // Lưu ID cuộc trò chuyện đang chờ xóa
    setPendingDeletion(conversationId)

    // Cập nhật UI ngay lập tức để ẩn cuộc trò chuyện
    queryClient.setQueryData(['CHAT_LIST'], (oldData: any) => {
      if (!oldData) return oldData

      // Đánh dấu cuộc trò chuyện là "đang chờ xóa" thay vì xóa hoàn toàn
      const updatedPages = oldData.pages.map((page: any) => {
        if (!page.conversations) return page

        const updatedConversations = page.conversations.map((conv: any) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              pendingDeletion: true // Đánh dấu cuộc trò chuyện đang chờ xóa
            }
          }
          return conv
        })

        return {
          ...page,
          conversations: updatedConversations
        }
      })

      return {
        ...oldData,
        pages: updatedPages
      }
    })

    // Hiển thị toast với nút hoàn tác và nút đóng
    const toastId = toast.loading('Đang xóa cuộc trò chuyện...', {
      duration: UNDO_TIMEOUT,
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          toast.dismiss(toastId)
          undoDelete(conversationId)
        }
      },
      cancel: {
        label: 'Xóa ngay',
        onClick: () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          toast.dismiss(toastId)
          confirmDelete(conversationId, isGroup, isOwner)
        }
      },
      cancelButtonStyle: {
        backgroundColor: 'red',
        color: 'white'
      }
    })

    // Lưu timeout ID vào ref để có thể hủy nếu cần
    const timeoutId = setTimeout(() => {
      // Đóng toast trước khi thực hiện xóa
      toast.dismiss(toastId)
      // Thực hiện xóa sau thời gian nếu không hoàn tác
      confirmDelete(conversationId, isGroup, isOwner)
    }, UNDO_TIMEOUT) // Đợi thời gian trước khi thực sự xóa

    // Lưu timeout ID vào ref để có thể hủy trong các hàm khác
    timeoutRef.current = timeoutId
  }

  // Hàm để xác nhận xóa cuộc trò chuyện ngay lập tức
  const confirmDelete = (conversationId: string, isGroup: boolean = false, isOwner: boolean = false) => {
    // Thực hiện xóa ngay lập tức
    let deletePromise

    if (isGroup && isOwner) {
      // Nếu là nhóm và người dùng là owner, sử dụng API xóa nhóm
      deletePromise = conversationsService.deleteGroupConversation(conversationId)
    } else {
      // Nếu không, chỉ ẩn cuộc trò chuyện khỏi danh sách
      deletePromise = conversationsService.deleteConversation(conversationId)
    }

    deletePromise
      .then((data) => {
        setPendingDeletion(null)

        if (isGroup && isOwner) {
          toast.success('Đã xóa nhóm chat thành công', { duration: 2000 })
          // Chuyển hướng về trang messages nếu đang ở trong chat bị xóa
          if (window.location.pathname.includes(`/messages/${conversationId}`)) {
            router.push('/messages')
          }
        } else {
          toast.success('Đã xóa cuộc trò chuyện khỏi danh sách', { duration: 2000 })
        }

        // Invalidate chat list query để cập nhật UI
        queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      })
      .catch((error) => {
        // Khôi phục cuộc trò chuyện nếu xóa thất bại
        setPendingDeletion(null)
        undoDelete(conversationId)
        toast.error(error?.response?.data?.message || 'Không thể xóa cuộc trò chuyện')
      })
  }

  // Hàm để hoàn tác việc xóa
  const undoDelete = (conversationId: string) => {
    // Hủy timeout nếu có
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Khôi phục cuộc trò chuyện trong UI
    queryClient.setQueryData(['CHAT_LIST'], (oldData: any) => {
      if (!oldData) return oldData

      // Bỏ đánh dấu "đang chờ xóa"
      const updatedPages = oldData.pages.map((page: any) => {
        if (!page.conversations) return page

        const updatedConversations = page.conversations.map((conv: any) => {
          if (conv._id === conversationId) {
            const { pendingDeletion, ...rest } = conv
            return rest // Loại bỏ thuộc tính pendingDeletion
          }
          return conv
        })

        return {
          ...page,
          conversations: updatedConversations
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
    toast.success('Đã hoàn tác xóa cuộc trò chuyện')
  }

  // Cleanup effect to clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Trả về các hàm và trạng thái
  return {
    deleteWithUndo,
    undoDelete,
    pendingDeletion
  }
}

// Thêm hook để quản lý archive chat
export const useArchiveChat = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  // Mutation để archive chat
  const archiveChat = useMutation({
    mutationFn: (chatId: string) => conversationsService.archiveChat(chatId),
    onSuccess: (data, chatId) => {
      // Cập nhật cache để đánh dấu chat đã archive
      queryClient.setQueryData(['CHAT_LIST'], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.conversations) return page

          const updatedConversations = page.conversations.filter((conv: any) => conv._id !== chatId)

          return {
            ...page,
            conversations: updatedConversations
          }
        })

        return {
          ...oldData,
          pages: updatedPages
        }
      })

      // Thêm chat vào danh sách archived nếu đang xem archived chats
      queryClient.setQueryData(['ARCHIVED_CHAT_LIST'], (oldData: any) => {
        if (!oldData) return oldData

        // Thêm chat vào trang đầu tiên của archived list
        const firstPage = oldData.pages[0] ? { ...oldData.pages[0] } : { conversations: [] }
        firstPage.conversations = [data, ...(firstPage.conversations || [])]

        return {
          ...oldData,
          pages: [firstPage, ...(oldData.pages.slice(1) || [])]
        }
      })

      // Invalidate cả hai query để đảm bảo dữ liệu được cập nhật
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })

      // Hiển thị thông báo thành công
      toast.success('Đã lưu trữ cuộc trò chuyện')

      // Chuyển hướng về trang messages nếu đang ở trong chat bị archive
      if (window.location.pathname.includes(`/messages/${chatId}`)) {
        router.push('/messages')
      }
    },
    onError: () => {
      toast.error('Không thể lưu trữ cuộc trò chuyện')
    }
  })

  // Mutation để unarchive chat
  const unarchiveChat = useMutation({
    mutationFn: (chatId: string) => conversationsService.unarchiveChat(chatId),
    onSuccess: (data, chatId) => {
      // Cập nhật cache để xóa chat khỏi danh sách archived
      queryClient.setQueryData(['ARCHIVED_CHAT_LIST'], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.conversations) return page

          const updatedConversations = page.conversations.filter((conv: any) => conv._id !== chatId)

          return {
            ...page,
            conversations: updatedConversations
          }
        })

        return {
          ...oldData,
          pages: updatedPages
        }
      })

      // Thêm chat vào danh sách chính
      queryClient.setQueryData(['CHAT_LIST'], (oldData: any) => {
        if (!oldData) return oldData

        // Thêm chat vào trang đầu tiên
        const firstPage = { ...oldData.pages[0] }
        firstPage.conversations = [data, ...firstPage.conversations]

        return {
          ...oldData,
          pages: [firstPage, ...oldData.pages.slice(1)]
        }
      })

      // Invalidate cả hai query để đảm bảo dữ liệu được cập nhật
      queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Hiển thị thông báo thành công
      toast.success('Đã bỏ lưu trữ cuộc trò chuyện')
    },
    onError: () => {
      toast.error('Không thể khôi phục cuộc trò chuyện')
    }
  })

  // Query để lấy danh sách archived chats
  const archivedChats = useInfiniteQuery({
    queryKey: ['ARCHIVED_CHATS'],
    queryFn: ({ pageParam = 1 }) => conversationsService.getArchivedChats(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.nextPage
      }
      return undefined
    }
  })

  return {
    archiveChat,
    unarchiveChat,
    archivedChats
  }
}

// Hook để ghim/bỏ ghim tin nhắn
export const usePinMessage = (chatId: string) => {
  const queryClient = useQueryClient()
  const socket = useSocket().socket

  return useMutation({
    mutationFn: (messageId: string) => conversationsService.pinMessage(messageId),
    onSuccess: (data) => {
      // Cập nhật cache để thay đổi trạng thái ghim của tin nhắn
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            if (msg._id === data._id) {
              return {
                ...msg,
                isPinned: data.isPinned
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

      // Cập nhật danh sách tin nhắn ghim
      queryClient.invalidateQueries({ queryKey: ['PINNED_MESSAGES', chatId] })

      // Hiển thị thông báo thành công
      toast.success(data.isPinned ? 'Đã ghim tin nhắn' : 'Đã bỏ ghim tin nhắn')
    },
    onError: (error: any) => {
      toast.error('Không thể thực hiện thao tác. Vui lòng thử lại sau.')
    }
  })
}

// Hook để lấy tin nhắn đã ghim
export const usePinnedMessages = (chatId: string) => {
  return useQuery({
    queryKey: ['PINNED_MESSAGES', chatId],
    queryFn: () => conversationsService.getPinnedMessages(chatId),
    enabled: !!chatId
  })
}

// Thêm hook useCheckConversationAccess
export const useCheckConversationAccess = (chatId: string | undefined) => {
  return useQuery({
    queryKey: ['CHAT_ACCESS', chatId],
    queryFn: async () => {
      if (!chatId) throw new Error('Chat ID is required')
      return await conversationsService.checkChatAccess(chatId)
    },
    enabled: !!chatId,
    retry: false,
    refetchOnWindowFocus: true
  })
}

// Thêm hook để kiểm tra quyền gửi tin nhắn
export function useCheckSendMessagePermissionQuery(chatId: string | undefined) {
  return useQuery({
    queryKey: ['SEND_PERMISSION', chatId],
    queryFn: async () => {
      if (!chatId) return null
      try {
        // Thử gọi API
        return await conversationsService.checkSendMessagePermission(chatId)
      } catch (error) {
        console.error('Error checking send permission, returning default:', error)
        // Trả về giá trị mặc định nếu API không hoạt động
        return {
          canSendMessages: true,
          isMuted: false,
          mutedUntil: null,
          restrictedByGroupSettings: false,
          restrictUntil: null,
          conversationId: chatId
        }
      }
    },
    enabled: !!chatId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 // 1 phút
  })
}

// Hook để xóa lịch sử chat
export const useClearChatHistory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => conversationsService.clearChatHistory(conversationId),
    onSuccess: (data, conversationId) => {
      // Cập nhật cache để xóa tin nhắn cũ và hiển thị tin nhắn hệ thống
      queryClient.setQueryData(['MESSAGES', conversationId], (oldData: any) => {
        if (!oldData) return oldData

        // Chỉ giữ lại tin nhắn hệ thống mới
        const systemMessage = data?.systemMessage;
        
        return {
          ...oldData,
          pages: [{
            messages: systemMessage ? [systemMessage] : [],
            hasMore: false,
            conversation: oldData.pages[0]?.conversation
          }]
        }
      })

      // Cập nhật danh sách chat để hiển thị tin nhắn hệ thống mới
      // (Không cần cập nhật cache ở đây vì đã được xử lý bởi socket)

      toast.success('Đã xóa lịch sử tin nhắn')
    },
    onError: () => {
      toast.error('Không thể xóa lịch sử tin nhắn')
    }
  })
}
