'use client'
import { format, formatDistanceToNow } from 'date-fns'
import { Archive, ArrowDown, ArrowLeft, Check, CheckCheck, Copy, Heart, Phone, Send, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Separator } from '~/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { use } from 'react'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { useArchiveChat, useMarkChatAsRead, useMessages, usePinMessage } from '~/hooks/data/chat.hooks'
import { useSocket } from '~/hooks/use-socket'

import { useQueryClient } from '@tanstack/react-query'
import { vi } from 'date-fns/locale'
import { throttle } from 'lodash'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { AddGroupMembersDialog } from '~/components/add-group-members-dialog'
import FriendHoverCard from '~/components/friend-hover-card'
import { GroupSettingsDialog } from '~/components/group-settings-dialog'
import ChatSkeleton from '~/components/ui/chat/chat-skeleton'
import { MessageActions } from '~/components/ui/chat/message-actions'
import MessageLoading from '~/components/ui/chat/message-loading'
import httpRequest from '~/config/http-request'
import {
  CALL_TYPE,
  CHAT_TYPE,
  FRIEND_REQUEST_STATUS,
  MEDIA_TYPE,
  MESSAGE_STATUS,
  MESSAGE_TYPE
} from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useFriendStatus } from '~/hooks/data/friends.hook'
import { useCheckSendMessagePermissionQuery } from '~/hooks/data/group-chat.hooks'
import { useIsBlockedByUser } from '~/hooks/data/user.hooks'
import useMediaQuery from '~/hooks/use-media-query'
import { useProtectedChat } from '~/hooks/use-protected-chat'
import { useRouter } from '~/i18n/navigation'
import { startCall } from '~/lib/call-helper'
import { FriendActionButton } from './components/friend-action-button'
import { PinnedMessages } from './components/pinned-messages'

const PRIMARY_RGB = '14, 165, 233' // Giá trị RGB của màu primary (sky-500)
const SUCCESS_RGB = '34, 197, 94' // Giá trị RGB của màu green-500

type Props = {
  params: Promise<{ chatId: string }>
}

interface Message {
  _id: string
  chatId: string
  senderId: {
    _id: string
    name: string
    avatar?: string
  }
  content?: string
  attachments?: {
    mediaUrl: string
    type: MEDIA_TYPE
  }[]
  type: MESSAGE_TYPE
  status: MESSAGE_STATUS
  readBy: string[]
  isPinned?: boolean
  createdAt: string
  updatedAt: string
}

function ChatDetail({ params }: Props) {
  // 1. Tất cả các state và ref
  const { chatId } = use(params)
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [sentTempIds, setSentTempIds] = useState<Set<string>>(new Set())
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [userStatus, setUserStatus] = useState<{
    isOnline: boolean
    lastActive: string | null
  }>({
    isOnline: false,
    lastActive: null
  })

  // Sử dụng hook bảo vệ
  const { isLoading: isCheckingAccess, hasAccess } = useProtectedChat(chatId)
  // Thêm hook để kiểm tra người dùng có bị chặn không
  const { data: isBlockedByUser = false } = useIsBlockedByUser(otherUserId!)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Thêm state để lưu trữ thông tin người dùng
  const [userInfoMap, setUserInfoMap] = useState<Record<string, { name: string; avatar: string }>>({})
  // Thêm state để theo dõi việc hiển thị popover reactions
  const [openReactionPopover, setOpenReactionPopover] = useState<string | null>(null)
  // Thêm state để theo dõi việc hiển thị popover người đã xem
  const [openReadersPopover, setOpenReadersPopover] = useState<string | null>(null)
  // Thêm state để theo dõi trạng thái loading
  // Thêm state để theo dõi các tin nhắn đã thả tim localy trước khi server phản hồi
  const [localReactions, setLocalReactions] = useState<Record<string, boolean>>({})
  // Thêm state để theo dõi người dùng online trong nhóm
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  // Trong component, thêm state để theo dõi tin nhắn đã xóa
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([])
  // Thêm state để theo dõi tin nhắn đã xóa
  const [processedDeletedMessages, setProcessedDeletedMessages] = useState<Set<string>>(new Set())
  // Thêm state để quản lý trạng thái của dialog
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  // Thêm state để lưu trữ thông tin người đã xem
  const [messageReaders, setMessageReaders] = useState<Record<string, any[]>>({})

  // Define scrollToBottom function
  const scrollToBottom = useCallback(() => {
    const scrollContainer = document.getElementById('messageScrollableDiv')
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  // Di chuyển useMessages lên trước các hook khác sử dụng các biến từ nó
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(chatId)

  // Hàm để scroll đến tin nhắn cụ thể
  const scrollToMessage = useCallback(
    (messageId: string) => {
      // Tìm phần tử tin nhắn theo ID
      const messageElement = document.getElementById(`message-${messageId}`)
      const scrollContainer = document.getElementById('messageScrollableDiv')

      if (messageElement && scrollContainer) {
        // Scroll tin nhắn vào giữa view
        messageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })

        // Điều chỉnh vị trí scroll thêm một chút để chính xác hơn
        setTimeout(() => {
          const messageRect = messageElement.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()
          const offset = messageRect.top - containerRect.top - (containerRect.height / 2 - messageRect.height / 2)

          scrollContainer.scrollTop = scrollContainer.scrollTop + offset

          // Thêm hiệu ứng highlight với màu xanh lá cây
          messageElement.style.transition = 'background-color 0.5s ease'
          messageElement.style.backgroundColor = `rgba(${SUCCESS_RGB}, 0.15)`

          setTimeout(() => {
            messageElement.style.backgroundColor = ''
          }, 2000)
        }, 100)
      } else {
        console.log('Không tìm thấy tin nhắn hoặc container:', messageId)
        // Nếu không tìm thấy tin nhắn, có thể nó chưa được tải
        // Cần tải thêm tin nhắn cũ và thử lại
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage().then(() => {
            // Thử lại sau khi tải thêm tin nhắn với timeout dài hơn
            setTimeout(() => {
              const messageElement = document.getElementById(`message-${messageId}`)
              if (messageElement) {
                // Đảm bảo tin nhắn đã được render đầy đủ trước khi scroll
                messageElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                })

                // Thêm hiệu ứng highlight
                messageElement.style.transition = 'background-color 0.5s ease'
                messageElement.style.backgroundColor = `rgba(${PRIMARY_RGB}, 0.15)`

                setTimeout(() => {
                  messageElement.style.backgroundColor = ''
                }, 2000)
              } else {
                // Nếu vẫn không tìm thấy, có thể cần fetch thêm
                if (hasNextPage) {
                  fetchNextPage()
                }
              }
            }, 800) // Tăng timeout để đảm bảo DOM đã cập nhật
          })
        }
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  const isMobile = useMediaQuery('(max-width: 768px)')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const { socket } = useSocket()
  const { mutate: markAsRead } = useMarkChatAsRead()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { archiveChat, unarchiveChat } = useArchiveChat()

  // Thêm hook để ghim tin nhắn
  const { mutate: pinMessage } = usePinMessage(chatId as string)

  // Kiểm tra xem có ai đang typing không
  const isAnyoneTyping = useMemo(() => {
    return Object.values(typingUsers).some(Boolean)
  }, [typingUsers])

  // Lấy tất cả tin nhắn từ cache - Không cần localMessages nữa
  const allMessages = useMemo(() => {
    // Lấy tin nhắn từ cache
    const messages = data ? data.pages.flatMap((page: any) => page?.messages || []) : []

    // Sắp xếp tin nhắn theo thời gian tạo (từ cũ đến mới)
    return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [data])

  // Đánh dấu chat đã đọc và revalidate query khi component mount
  useEffect(() => {
    if (chatId) {
      // Đánh dấu chat đã đọc
      markAsRead(chatId)

      // Revalidate query để lấy tin nhắn mới nhất
      queryClient.invalidateQueries({
        queryKey: ['MESSAGES', chatId]
      })
    }
  }, [chatId, markAsRead])

  // Scroll to bottom on first load or when new message arrives
  useEffect(() => {
    // Nếu đang tải tin nhắn cũ, không cuộn xuống
    if (isFetchingNextPage) {
      return
    }

    if (messagesEndRef.current && isFirstLoad) {
      // Đặt timeout dài hơn để đảm bảo tất cả tin nhắn đã được render
      setTimeout(() => {
        // Thay vì sử dụng scrollIntoView, chỉ cuộn container tin nhắn
        const scrollableDiv = document.getElementById('messageScrollableDiv')
        if (scrollableDiv) {
          scrollableDiv.scrollTop = scrollableDiv.scrollHeight
        }
        setIsFirstLoad(false)
      }, 500) // Tăng timeout lên 500ms
    }
  }, [isFirstLoad, isFetchingNextPage, data]) // Thêm data để đảm bảo cuộn xuống khi data đã sẵn sàng

  // Thêm useEffect để đảm bảo socket đã kết nối và tham gia vào room
  useEffect(() => {
    if (!socket || !chatId) return

    // Tham gia vào room chat
    socket.emit('JOIN_ROOM', chatId)

    return () => {
      // Rời khỏi room khi unmount
      socket.emit('LEAVE_ROOM', chatId)
    }
  }, [socket, chatId])

  // Lắng nghe sự kiện typing từ người dùng khác
  useEffect(() => {
    if (!socket || !chatId) return

    const handleTypingStart = (data: { userId: string; chatId: string }) => {
      if (data.chatId === chatId && data.userId !== session?.user?._id) {
        // Sử dụng functional update để đảm bảo state luôn được cập nhật chính xác
        setTypingUsers((prev) => ({ ...prev, [data.userId]: true }))
      }
    }

    const handleTypingStop = (data: { userId: string; chatId: string }) => {
      if (data.chatId === chatId && data.userId !== session?.user?._id) {
        // Thêm delay nhỏ trước khi ẩn hiệu ứng typing để tránh nhấp nháy
        setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [data.userId]: false }))
        }, 500)
      }
    }

    socket.on(SOCKET_EVENTS.TYPING_START, handleTypingStart)
    socket.on(SOCKET_EVENTS.TYPING_STOP, handleTypingStop)

    return () => {
      socket.off(SOCKET_EVENTS.TYPING_START, handleTypingStart)
      socket.off(SOCKET_EVENTS.TYPING_STOP, handleTypingStop)
    }
  }, [socket, chatId, session?.user?._id])

  const handleFetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return
    }

    // Lưu vị trí cuộn hiện tại
    const scrollableDiv = document.getElementById('messageScrollableDiv')
    const scrollPosition = scrollableDiv?.scrollTop || 0
    const scrollHeight = scrollableDiv?.scrollHeight || 0

    fetchNextPage()
      .then(() => {
        // Đặt timeout để đảm bảo DOM đã được cập nhật
        setTimeout(() => {
          if (scrollableDiv) {
            // Tính toán vị trí cuộn mới để giữ nguyên vị trí người dùng đang xem
            const newScrollHeight = scrollableDiv.scrollHeight
            const scrollDiff = newScrollHeight - scrollHeight
            scrollableDiv.scrollTop = scrollPosition + scrollDiff
          }
        }, 100)
      })
      .catch((error) => {
        console.error('Error fetching next page:', error)
      })
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  // Thêm useEffect để đăng ký sự kiện wheel
  useEffect(() => {
    const scrollableDiv = document.getElementById('messageScrollableDiv')
    if (!scrollableDiv) return

    // Thêm biến để theo dõi thời gian cuối cùng fetch
    let lastFetchTime = 0
    const FETCH_COOLDOWN = 1000 // 1 giây cooldown

    const handleWheelWithThrottle = (e: WheelEvent) => {
      const now = Date.now()
      if (scrollableDiv.scrollTop < 100 && e.deltaY < 0 && hasNextPage && !isFetchingNextPage) {
        // Chỉ fetch nếu đã qua thời gian cooldown
        if (now - lastFetchTime > FETCH_COOLDOWN) {
          lastFetchTime = now
          handleFetchNextPage()
        }
      }
    }

    scrollableDiv.addEventListener('wheel', handleWheelWithThrottle, { passive: true })

    return () => {
      scrollableDiv.removeEventListener('wheel', handleWheelWithThrottle)
    }
  }, [handleFetchNextPage, hasNextPage, isFetchingNextPage])

  // Thêm useEffect để theo dõi trạng thái isFetchingNextPage và cập nhật thuộc tính trên body
  useEffect(() => {
    if (isFetchingNextPage) {
      document.body.setAttribute('data-fetching-old-messages', 'true')
    } else {
      document.body.setAttribute('data-fetching-old-messages', 'false')
    }
  }, [isFetchingNextPage])

  // Thêm useEffect để lấy ID người dùng khác từ cuộc trò chuyện
  useEffect(() => {
    if (data?.pages[0]?.conversation?.type === CHAT_TYPE.PRIVATE) {
      const otherParticipant = data.pages[0].conversation.participants.find((p: any) => p._id !== session?.user?._id)

      if (otherParticipant) {
        setOtherUserId(otherParticipant._id)
      }
    }
  }, [data?.pages, session?.user?._id])

  // Thêm useEffect để lắng nghe sự kiện online/offline
  useEffect(() => {
    if (!socket || !chatId) return

    // Nếu là chat nhóm, cập nhật danh sách người dùng online
    if (isGroupChat) {
      // Kiểm tra trạng thái online của tất cả thành viên
      const participants = data?.pages[0].conversation.participants || []
      participants.forEach((participant: any) => {
        if (participant._id !== session?.user?._id) {
          socket.emit(SOCKET_EVENTS.CHECK_ONLINE, participant._id, (isUserOnline: boolean) => {
            // Cập nhật trạng thái online cho thành viên này
            if (isUserOnline) {
              // Cập nhật state hoặc context để hiển thị số người online
              setOnlineUsers((prev) => new Set([...prev, participant._id]))
            }
          })
        }
      })

      // Lắng nghe sự kiện online/offline để cập nhật danh sách
      const handleUserOnline = (userId: string) => {
        const isGroupMember = participants.some((p: any) => p._id === userId)
        if (isGroupMember && userId !== session?.user?._id) {
          setOnlineUsers((prev) => new Set([...prev, userId]))
        }
      }

      const handleUserOffline = (userId: string) => {
        setOnlineUsers((prev) => {
          const newSet = new Set([...prev])
          newSet.delete(userId)
          return newSet
        })
      }

      socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
      socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)

      return () => {
        socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
        socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)
      }
    } else {
      if (!otherUser) return

      // Kiểm tra trạng thái online ban đầu
      socket.emit(SOCKET_EVENTS.CHECK_ONLINE, otherUser._id, (isUserOnline: boolean, lastActiveTime: string) => {
        setUserStatus({
          isOnline: isUserOnline,
          lastActive: lastActiveTime || userStatus.lastActive
        })
      })

      // Lắng nghe sự kiện online
      const handleUserOnline = (userId: string) => {
        if (userId === otherUser._id) {
          setUserStatus({
            isOnline: true,
            lastActive: new Date().toISOString()
          })
        }
      }

      // Lắng nghe sự kiện offline
      const handleUserOffline = (userId: string, lastActiveTime: string) => {
        if (userId === otherUser._id) {
          setUserStatus({
            isOnline: false,
            lastActive: lastActiveTime || userStatus.lastActive
          })
        }
      }

      socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
      socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)

      return () => {
        socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
        socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)
      }
    }
  }, [socket, chatId, data])

  // Thêm useEffect để đánh dấu tin nhắn đã đọc khi người dùng xem
  useEffect(() => {
    if (!socket || !chatId || !allMessages.length || !isAtBottom) return

    // Lấy các tin nhắn chưa đọc từ người khác
    const unreadMessages = allMessages.filter(
      (msg) => !isMessageFromCurrentUser(msg) && msg.status !== MESSAGE_STATUS.SEEN
    )

    // Chỉ đánh dấu đã đọc khi có tin nhắn chưa đọc VÀ người dùng đang xem cuộc trò chuyện này
    if (unreadMessages.length > 0 && document.visibilityState === 'visible') {
      // Gửi sự kiện đánh dấu đã đọc
      socket.emit(SOCKET_EVENTS.MARK_AS_READ, {
        chatId,
        messageIds: unreadMessages.map((msg) => msg._id)
      })

      // Cập nhật cache để đánh dấu tin nhắn đã đọc
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            if (!isMessageFromCurrentUser(msg) && msg.status !== MESSAGE_STATUS.SEEN) {
              return {
                ...msg,
                status: MESSAGE_STATUS.SEEN
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

      // Cập nhật cache của danh sách chat để đánh dấu cuộc trò chuyện là đã đọc
      queryClient.setQueryData(['CHAT_LIST'], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page?.conversations) return page

          const updatedConversations = page.conversations.map((chat: any) => {
            if (chat._id === chatId) {
              return {
                ...chat,
                read: true,
                lastMessage: chat.lastMessage
                  ? {
                      ...chat.lastMessage,
                      status: MESSAGE_STATUS.SEEN
                    }
                  : null
              }
            }
            return chat
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
    }
  }, [socket, chatId, allMessages, isAtBottom, queryClient])

  // Thêm event listener cho visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && chatId && allMessages.length) {
        // Lấy các tin nhắn chưa đọc từ người khác
        const unreadMessages = allMessages.filter(
          (msg) => !isMessageFromCurrentUser(msg) && msg.status !== MESSAGE_STATUS.SEEN
        )

        if (unreadMessages.length > 0) {
          // Gửi sự kiện đánh dấu đã đọc
          socket.emit(SOCKET_EVENTS.MARK_AS_READ, {
            chatId,
            messageIds: unreadMessages.map((msg) => msg._id)
          })

          // Cập nhật cache
          queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
            if (!oldData) return oldData

            const updatedPages = oldData.pages.map((page: any) => {
              if (!page.messages) return page

              const updatedMessages = page.messages.map((msg: any) => {
                if (!isMessageFromCurrentUser(msg) && msg.status !== MESSAGE_STATUS.SEEN) {
                  return {
                    ...msg,
                    status: MESSAGE_STATUS.SEEN
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
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [socket, chatId, allMessages, queryClient])

  // Thêm useEffect để lắng nghe sự kiện tin nhắn đã đọc
  useEffect(() => {
    if (!socket || !chatId) return

    const handleMessageRead = (data: { chatId: string; messageIds: string[]; messages?: any[]; readBy: string }) => {
      if (data.chatId !== chatId) return

      // Cập nhật cache để đánh dấu tin nhắn đã đọc
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData || !('pages' in oldData)) return oldData

        const updatedPages = (oldData as { pages: any[] }).pages.map((page: any) => {
          if (!page || !page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            // Tìm tin nhắn tương ứng trong danh sách cập nhật
            const updatedMsg = data.messages?.find((m) => m._id === msg._id)

            if (updatedMsg) {
              return {
                ...msg,
                status: updatedMsg.status,
                readBy: updatedMsg.readBy
              }
            }

            // Nếu tin nhắn không có trong danh sách cập nhật nhưng có trong messageIds
            if (data.messageIds.includes(msg._id)) {
              // Thêm người đọc vào readBy nếu chưa có
              const readBy = [...(msg.readBy || [])]
              if (!readBy.includes(data.readBy)) {
                readBy.push(data.readBy)
              }

              // Lọc ra danh sách người đọc, loại bỏ người gửi tin nhắn
              const filteredReadBy = readBy.filter((userId) =>
                typeof msg.senderId === 'object' && msg.senderId._id
                  ? String(userId) !== String(msg.senderId._id)
                  : String(userId) !== String(msg.senderId)
              )

              return {
                ...msg,
                readBy: filteredReadBy,
                // Cập nhật status nếu tất cả người tham gia đã đọc
                status:
                  filteredReadBy.length >= (msg.participants?.length || 0) - 1
                    ? MESSAGE_STATUS.SEEN
                    : MESSAGE_STATUS.DELIVERED
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
    }

    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead)

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead)
    }
  }, [socket, chatId, queryClient])

  // Thêm useEffect để lắng nghe sự kiện cập nhật reaction
  useEffect(() => {
    if (!socket || !chatId) return

    const handleReactionUpdated = (data: { messageId: string; reactions: any[] }) => {
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            if (msg._id === data.messageId) {
              return {
                ...msg,
                reactions: data.reactions
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
    }

    socket.on(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, handleReactionUpdated)

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, handleReactionUpdated)
    }
  }, [socket, chatId, queryClient])

  // Add socket listener for friend status changes
  const {
    data: friendStatusData,
    isPending: isLoadingFriendStatus,
    refetch: refetchFriendStatus
  } = useFriendStatus(otherUserId || undefined, {
    enabled: !!otherUserId && otherUserId !== session?.user?._id
  })

  // Lấy trạng thái từ data của hook
  const friendStatus = friendStatusData?.status || null
  const isFriend = friendStatus === FRIEND_REQUEST_STATUS.ACCEPTED

  // Thêm useEffect để đồng bộ tin nhắn khi mở cuộc trò chuyện
  useEffect(() => {
    if (!socket || !chatId || !data) return

    // Lấy ID tin nhắn mới nhất đã có
    const latestMessageId = data.pages[0]?.messages?.[0]?._id

    if (latestMessageId) {
      // Gửi yêu cầu kiểm tra tin nhắn mới
      socket.emit('CHECK_NEW_MESSAGES', {
        chatId,
        latestMessageId
      })
    }
  }, [socket, chatId, data])

  // Thêm listener cho sự kiện SYNC_MESSAGES
  useEffect(() => {
    if (!socket) return

    const handleSyncMessages = (data: { messages: any[]; chatId: string }) => {
      if (data.chatId === chatId && data.messages.length > 0) {
        // Cập nhật cache với tin nhắn mới
        queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
          if (!oldData) return oldData

          // Thêm tin nhắn mới vào đầu trang đầu tiên
          const updatedPages = [...oldData.pages]
          if (updatedPages[0] && updatedPages[0].messages) {
            // Lọc ra các tin nhắn chưa có
            const newMessages = data.messages.filter(
              (newMsg) => !updatedPages[0].messages.some((msg: any) => msg._id === newMsg._id)
            )

            if (newMessages.length > 0) {
              updatedPages[0] = {
                ...updatedPages[0],
                messages: [...newMessages, ...updatedPages[0].messages]
              }
            }
          }

          return {
            ...oldData,
            pages: updatedPages
          }
        })
      }
    }

    socket.on('SYNC_MESSAGES', handleSyncMessages)

    return () => {
      socket.off('SYNC_MESSAGES', handleSyncMessages)
    }
  }, [socket, chatId, queryClient])

  // Lọc tin nhắn đã xóa khỏi danh sách hiển thị
  const filteredMessages = useMemo(() => {
    // Tạo một Set để theo dõi các ID tin nhắn đã thấy
    const seenMessageIds = new Set()

    // Lọc tin nhắn đã xóa và loại bỏ tin nhắn trùng lặp
    return allMessages.filter((msg) => {
      // Bỏ qua tin nhắn đã xóa
      if (deletedMessageIds.includes(msg._id)) {
        return false
      }

      // Kiểm tra xem ID tin nhắn đã xuất hiện chưa
      if (seenMessageIds.has(msg._id)) {
        return false // Bỏ qua tin nhắn trùng lặp
      }

      // Thêm ID tin nhắn vào danh sách đã thấy
      seenMessageIds.add(msg._id)
      return true
    })
  }, [allMessages, deletedMessageIds])

  // 4. Tất cả các hàm xử lý sự kiện
  // Hàm kiểm tra xem tin nhắn có phải do người dùng hiện tại gửi không
  const isMessageFromCurrentUser = useCallback(
    (message: any) => {
      if (!message || !session?.user?._id) return false

      const currentUserId = session.user._id.toString()

      // Luôn chuyển đổi senderId về dạng string để so sánh
      let senderId: string

      if (typeof message.senderId === 'object' && message.senderId?._id) {
        senderId = message.senderId._id.toString()
      } else if (typeof message.senderId === 'string') {
        senderId = message.senderId
      } else {
        return false // Không thể xác định senderId
      }

      return senderId === currentUserId
    },
    [session?.user?._id]
  )

  // Thêm các hàm xử lý
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = e.target.value
    setMessage(newContent)

    // Xử lý typing event
    if (!isTyping) {
      setIsTyping(true)
      socket?.emit(SOCKET_EVENTS.TYPING, {
        chatId,
        isTyping: true
      })
    }

    // Clear timeout trước đó
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current)
    }

    // Đặt timeout mới
    typingDebounceRef.current = setTimeout(() => {
      setIsTyping(false)
      socket?.emit(SOCKET_EVENTS.TYPING, {
        chatId,
        isTyping: false
      })
    }, 3000)
  }

  // Thêm hook để kiểm tra quyền gửi tin nhắn
  const {
    data: sendPermission,
    isLoading: isCheckingSendPermission,
    refetch: refetchSendPermission
  } = useCheckSendMessagePermissionQuery(chatId)

  // Xác định biến canSendMessages dựa trên kết quả từ API
  const canSendMessages = useMemo(() => {
    // Nếu đang kiểm tra, mặc định là có thể gửi
    if (isCheckingSendPermission) return true

    // Nếu không có dữ liệu, mặc định là có thể gửi
    if (!sendPermission) return true

    // Trả về giá trị canSendMessages từ API
    return sendPermission.canSendMessages
  }, [sendPermission, isCheckingSendPermission])

  // Thêm useEffect để lắng nghe sự kiện từ socket
  useEffect(() => {
    if (!socket || !chatId) return

    // Lắng nghe sự kiện khi cài đặt nhóm thay đổi
    const handleGroupSettingsChanged = (data: any) => {
      console.log('Group settings changed:', data)

      // Cập nhật quyền gửi tin nhắn
      refetchSendPermission()

      // Kiểm tra nếu có thay đổi về cài đặt "Chỉ quản trị viên được gửi tin nhắn"
      if (data.onlyAdminsCanSend !== undefined) {
        // Hiển thị thông báo nếu không phải người cập nhật
        if (data.updatedBy !== session?.user?._id) {
          if (data.onlyAdminsCanSend) {
            const restrictUntilText = data.restrictUntil
              ? `đến ${new Date(data.restrictUntil).toLocaleString('vi-VN')}`
              : 'cho đến khi có thay đổi'

            toast.info(`Chế độ "Chỉ quản trị viên được gửi tin nhắn" đã được bật ${restrictUntilText}`)
          } else {
            toast.info('Chế độ "Chỉ quản trị viên được gửi tin nhắn" đã được tắt')
          }
        }

        // Thêm tin nhắn hệ thống vào cache nếu có
        if (data.message) {
          queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
            if (!oldData) return oldData

            const updatedPages = [...oldData.pages]

            // Thêm tin nhắn hệ thống vào trang đầu tiên
            if (updatedPages.length > 0 && updatedPages[0].messages) {
              // Kiểm tra xem tin nhắn đã tồn tại chưa
              const messageExists = updatedPages[0].messages.some((msg: any) => msg._id === data.message._id)

              if (!messageExists) {
                updatedPages[0] = {
                  ...updatedPages[0],
                  messages: [...updatedPages[0].messages, data.message]
                }
              }
            }

            return {
              ...oldData,
              pages: updatedPages
            }
          })
        }
      }
    }

    // Đăng ký lắng nghe các sự kiện liên quan
    socket.on(SOCKET_EVENTS.GROUP_SETTINGS_UPDATED, handleGroupSettingsChanged)
    socket.on(SOCKET_EVENTS.MEMBER_ROLE_UPDATED, handleGroupSettingsChanged)
    socket.on(SOCKET_EVENTS.MEMBER_MUTED, handleGroupSettingsChanged)
    socket.on(SOCKET_EVENTS.MEMBER_UNMUTED, handleGroupSettingsChanged)

    return () => {
      socket.off(SOCKET_EVENTS.GROUP_SETTINGS_UPDATED, handleGroupSettingsChanged)
      socket.off(SOCKET_EVENTS.MEMBER_ROLE_UPDATED, handleGroupSettingsChanged)
      socket.off(SOCKET_EVENTS.MEMBER_MUTED, handleGroupSettingsChanged)
      socket.off(SOCKET_EVENTS.MEMBER_UNMUTED, handleGroupSettingsChanged)
    }
  }, [socket, chatId, refetchSendPermission, queryClient, session?.user?._id])

  const handleSendHeartEmoji = () => {
    // Kiểm tra quyền gửi tin nhắn
    if (!canSendMessages) {
      // Hiển thị thông báo lỗi tương tự như trên
      if (sendPermission?.isMuted) {
        const mutedUntilText = sendPermission.mutedUntil
          ? `đến ${format(new Date(sendPermission.mutedUntil), 'PPP HH:mm', { locale: vi })}`
          : 'vô thời hạn'
        toast.error(`Bạn đã bị cấm chat ${mutedUntilText}`)
      } else if (sendPermission?.restrictedByGroupSettings) {
        const restrictUntilText = sendPermission.restrictUntil
          ? `đến ${format(new Date(sendPermission.restrictUntil), 'PPP HH:mm', { locale: vi })}`
          : ''
        toast.error(`Chỉ quản trị viên mới có thể gửi tin nhắn ${restrictUntilText}`)
      } else {
        toast.error('Bạn không có quyền gửi tin nhắn trong nhóm này')
      }
      return
    }

    // Tạo tin nhắn tạm thời với ID duy nhất
    const tempId = uuidv4()

    // Thêm tempId vào danh sách đã gửi
    setSentTempIds((prev) => new Set([...prev, tempId]))

    // Gửi tin nhắn tim qua socket với tempId
    socket?.emit(SOCKET_EVENTS.SEND_MESSAGE, {
      chatId,
      content: '❤️',
      type: 'TEXT',
      tempId,
      senderName: session?.user?.name,
      senderAvatar: session?.user?.avatar,
      status: MESSAGE_STATUS.DELIVERED
    })

    // Cập nhật danh sách chat
    queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    // Nếu đang trong trạng thái typing, gửi sự kiện dừng typing
    if (isTyping) {
      setIsTyping(false)
      socket?.emit(SOCKET_EVENTS.TYPING, {
        chatId,
        isTyping: false
      })

      // Xóa timeout hiện tại nếu có
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
        typingDebounceRef.current = null
      }
    }

    // Tạo tin nhắn tạm thời với ID duy nhất
    const tempId = uuidv4()

    // Thêm tempId vào danh sách đã gửi
    setSentTempIds((prev) => new Set([...prev, tempId]))

    // Gửi tin nhắn qua socket với tempId
    socket?.emit(SOCKET_EVENTS.SEND_MESSAGE, {
      chatId,
      content: message,
      type: 'TEXT',
      tempId,
      senderName: session?.user?.name,
      senderAvatar: session?.user?.avatar,
      status: MESSAGE_STATUS.DELIVERED
    })

    // Reset input
    setMessage('')

    // Cập nhật danh sách chat
    queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Thêm hàm formatTime để hiển thị thời gian tin nhắn
  const formatTime = (date: string) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return formatDistanceToNow(messageDate, {
        addSuffix: false,
        includeSeconds: true,
        locale: vi
      }).replace('khoảng ', '')
    } else if (diffInHours < 24) {
      return format(messageDate, 'HH:mm', { locale: vi })
    } else if (diffInHours < 48) {
      return `Hôm qua, ${format(messageDate, 'HH:mm', { locale: vi })}`
    } else {
      return format(messageDate, 'dd/MM/yyyy HH:mm', { locale: vi })
    }
  }

  // Hàm định dạng thời gian hoạt động gần nhất
  const formatLastActive = (lastActiveTime: string | null) => {
    // Nếu không có lastActiveTime hoặc giá trị không hợp lệ
    if (!lastActiveTime) return 'now'

    // Xử lý trường hợp đặc biệt cho người dùng chưa từng online
    if (lastActiveTime === 'never') return 'a long time ago'

    try {
      const lastActive = new Date(lastActiveTime)
      // Kiểm tra xem lastActive có phải là ngày hợp lệ không
      if (isNaN(lastActive.getTime())) return 'unknown'

      const now = new Date()
      // Nếu lastActive là thời gian trong tương lai, trả về 'now'
      if (lastActive > now) return 'now'

      const diffInMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return 'now'
      if (diffInMinutes < 60) return `${diffInMinutes} mins ago`

      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours} hours ago`

      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays === 1) return 'yesterday'
      if (diffInDays < 7) return `${diffInDays} days ago`
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`

      // Nếu quá 1 năm
      return 'a long time ago'
    } catch (e) {
      console.error('Error formatting last active time:', e)
      return 'unknown'
    }
  }

  // Thêm hàm xử lý thả tim với log để debug
  const handleAddReaction = (messageId: string) => {
    if (!socket) {
      console.error('Socket not connected')
      return
    }

    // Cập nhật UI ngay lập tức
    setLocalReactions((prev) => ({
      ...prev,
      [messageId]: true
    }))

    socket.emit(SOCKET_EVENTS.ADD_REACTION, {
      messageId,
      reactionType: '❤️'
    })
  }

  // Thêm hàm xử lý xóa tim với log để debug
  const handleRemoveReaction = (messageId: string) => {
    if (!socket) {
      console.error('Socket not connected')
      return
    }

    // Cập nhật UI ngay lập tức
    setLocalReactions((prev) => ({
      ...prev,
      [messageId]: false
    }))

    socket.emit(SOCKET_EVENTS.REMOVE_REACTION, {
      messageId
    })
  }

  // Hàm kiểm tra xem người dùng hiện tại đã thả tim chưa
  const hasUserReacted = (message: any) => {
    // Nếu có trong localReactions, ưu tiên giá trị đó
    if (message._id in localReactions) {
      return localReactions[message._id]
    }

    // Nếu không, kiểm tra từ dữ liệu server
    if (!message.reactions || !Array.isArray(message.reactions)) return false
    return message.reactions.some(
      (reaction: any) =>
        (typeof reaction.userId === 'object' && reaction.userId._id === session?.user?._id) ||
        reaction.userId === session?.user?._id
    )
  }

  // Thêm useEffect để lấy thông tin người dùng khi có reaction mới
  useEffect(() => {
    const fetchUserInfo = async (userId: string) => {
      if (userInfoMap[userId]) return // Đã có thông tin rồi

      try {
        // Sử dụng httpRequest từ config thay vì fetch trực tiếp
        const response = await httpRequest.get(`/user/${userId}`)
        const userData = response.data.data

        setUserInfoMap((prev) => ({
          ...prev,
          [userId]: {
            name: userData?.name || 'User',
            avatar: userData?.avatar || ''
          }
        }))
      } catch (error) {
        console.error('Error fetching user info:', error)
        // Fallback nếu không lấy được thông tin
        setUserInfoMap((prev) => ({
          ...prev,
          [userId]: {
            name: 'User',
            avatar: ''
          }
        }))
      }
    }

    // Lấy danh sách userId từ tất cả các tin nhắn và reaction
    const allMessages = data?.pages?.flatMap((page) => page.messages) || []
    const allUserIds = new Set<string>()

    allMessages.forEach((msg) => {
      if (msg.reactions && Array.isArray(msg.reactions)) {
        msg.reactions.forEach((reaction: { userId: string | { _id: string }; type: string }) => {
          if (typeof reaction.userId === 'string') {
            allUserIds.add(reaction.userId)
          } else if (typeof reaction.userId === 'object' && reaction.userId._id) {
            allUserIds.add(reaction.userId._id)
          }
        })
      }
    })

    // Fetch thông tin cho mỗi userId
    allUserIds.forEach((userId) => {
      if (userId !== session?.user?._id) {
        // Bỏ qua người dùng hiện tại vì đã có thông tin
        fetchUserInfo(userId)
      }
    })
  }, [data?.pages, session?.user?._id, userInfoMap])

  // Thay thế useEffect cũ bằng hàm fetch theo yêu cầu
  const fetchUserInfoForReactions = async (messageId: string, reactions: any[]) => {
    if (!reactions || reactions.length === 0) return

    // Chỉ fetch thông tin cho các userId chưa có trong userInfoMap
    const userIdsToFetch = reactions
      .filter((reaction) => {
        // Lấy userId (dù là string hay object._id)
        const userId = typeof reaction.userId === 'string' ? reaction.userId : reaction.userId?._id || ''

        // Bỏ qua userId của người dùng hiện tại và userId đã có trong map
        return userId && userId !== session?.user?._id && !userInfoMap[userId]
      })
      .map((reaction) => (typeof reaction.userId === 'string' ? reaction.userId : reaction.userId?._id))

    // Loại bỏ các userId trùng lặp
    const uniqueUserIds = [...new Set(userIdsToFetch)]

    // Fetch thông tin cho từng userId
    const fetchPromises = uniqueUserIds.map(async (userId) => {
      try {
        const response = await httpRequest.get(`/user/${userId}`)
        const userData = response.data.data

        // Cập nhật userInfoMap
        setUserInfoMap((prev) => ({
          ...prev,
          [userId]: {
            name: userData?.name || 'User',
            avatar: userData?.avatar
          }
        }))
      } catch (error) {
        console.error(`Error fetching info for user ${userId}:`, error)
        // Fallback
        setUserInfoMap((prev) => ({
          ...prev,
          [userId]: {
            name: 'User',
            avatar: ''
          }
        }))
      }
    })

    // Chờ tất cả các request hoàn thành
    await Promise.all(fetchPromises)
  }

  // Sửa lại useEffect để xử lý sự kiện MESSAGE_DELETED
  useEffect(() => {
    if (!socket) return

    const handleMessageDeleted = (data: { messageId: string; chatId: string; deletedBy?: string }) => {
      // Chỉ xử lý nếu tin nhắn thuộc về chat hiện tại và chưa được xử lý
      if (data.chatId === chatId && !processedDeletedMessages.has(data.messageId)) {
        // Đánh dấu tin nhắn đã được xử lý
        setProcessedDeletedMessages((prev) => {
          const newSet = new Set(prev)
          newSet.add(data.messageId)
          return newSet
        })

        // Thêm vào danh sách tin nhắn đã xóa
        setDeletedMessageIds((prev) => [...prev, data.messageId])

        // Cập nhật cache để xóa tin nhắn
        queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
          if (!oldData) return oldData

          // Lọc tin nhắn đã xóa khỏi tất cả các trang
          const updatedPages = oldData.pages.map((page: any) => {
            if (!page.messages) return page

            const filteredMessages = page.messages.filter((msg: any) => msg._id !== data.messageId)

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

        // Cập nhật cache tin nhắn ghim
        queryClient.setQueryData(['PINNED_MESSAGES', chatId], (oldData: any) => {
          if (!oldData) return oldData

          // Lọc tin nhắn đã xóa khỏi danh sách tin nhắn ghim
          return oldData.filter((msg: any) => msg._id !== data.messageId)
        })

        // Cập nhật danh sách chat vì tin nhắn cuối cùng có thể đã thay đổi
        queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

        // Cập nhật danh sách tin nhắn ghim
        queryClient.invalidateQueries({ queryKey: ['PINNED_MESSAGES', chatId] })
      }
    }

    // CHỈ ĐĂNG KÝ LẮNG NGHE MỘT LẦN
    socket.on('MESSAGE_DELETED', handleMessageDeleted)

    return () => {
      socket.off('MESSAGE_DELETED', handleMessageDeleted)
    }
  }, [socket, chatId, queryClient, processedDeletedMessages])

  // Thêm useEffect để xử lý sự kiện MESSAGE_UPDATED
  useEffect(() => {
    if (!socket) return

    const handleMessageUpdated = (data: {
      messageId: string
      content: string
      isEdited: boolean
      chatId: string
      updatedBy?: string
    }) => {
      // Chỉ xử lý nếu tin nhắn thuộc về chat hiện tại
      if (data.chatId === chatId) {
        // Cập nhật cache để cập nhật tin nhắn
        queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
          if (!oldData) return oldData

          // Tìm và cập nhật tin nhắn trong tất cả các trang
          const updatedPages = oldData.pages.map((page: any) => {
            if (!page.messages) return page

            const updatedMessages = page.messages.map((msg: any) => {
              if (msg._id === data.messageId) {
                return {
                  ...msg,
                  content: data.content,
                  isEdited: data.isEdited
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

        // Cập nhật danh sách chat nếu tin nhắn được cập nhật là tin nhắn cuối cùng
        queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

        // Hiển thị thông báo - CHỈ HIỂN THỊ KHI KHÔNG PHẢI NGƯỜI CẬP NHẬT
        const currentUserId = session?.user?._id
        if (data.updatedBy !== currentUserId) {
          toast.success('Tin nhắn đã được cập nhật')
        }
      }
    }

    // CHỈ ĐĂNG KÝ LẮNG NGHE MỘT LẦN
    socket.on('MESSAGE_UPDATED', handleMessageUpdated)

    return () => {
      socket.off('MESSAGE_UPDATED', handleMessageUpdated)
    }
  }, [socket, chatId, queryClient, session?.user?._id])

  // Xử lý khi click vào nút archive/unarchive
  const handleArchiveToggle = () => {
    if (!chatId) return

    const isArchived = data?.pages[0]?.conversation?.isArchived

    if (isArchived) {
      unarchiveChat.mutate(chatId)
    } else {
      archiveChat.mutate(chatId)
    }
  }

  // Thêm useEffect để xử lý socket
  useEffect(() => {
    if (!socket || !chatId) return

    // Xử lý khi có tin nhắn được ghim/bỏ ghim
    const handleMessagePinned = (data: any) => {
      if (data.chatId !== chatId) return

      // Cập nhật cache để thay đổi trạng thái ghim của tin nhắn
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            if (msg._id === data.messageId) {
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
    }

    socket.on(SOCKET_EVENTS.MESSAGE_PINNED, handleMessagePinned)

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_PINNED, handleMessagePinned)
    }
  }, [socket, chatId, queryClient])

  if (isError) {
    return <div className='flex h-full items-center justify-center p-4'>Failed to fetch messages</div>
  }

  // Tạo các hàm xử lý scroll được throttle bằng lodash
  const handleScrollPosition = useCallback(
    throttle((scrollTop, scrollHeight, clientHeight) => {
      // Check if user is at bottom (within 100px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setIsAtBottom(isNearBottom)
      setShowScrollButton(!isNearBottom)
    }, 100),
    [setIsAtBottom, setShowScrollButton]
  )

  const handleScrollForFetch = useCallback(
    throttle((scrollElement, scrollTop) => {
      // Nếu cuộn gần đến đầu và có thêm dữ liệu, tải thêm
      if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
        const now = Date.now()
        // @ts-ignore - Thêm thuộc tính tạm thời vào element
        const lastFetchTime = scrollElement.lastFetchTime || 0
        const FETCH_COOLDOWN = 1000 // 1 giây cooldown

        // Chỉ fetch nếu đã qua thời gian cooldown
        if (now - lastFetchTime > FETCH_COOLDOWN) {
          // @ts-ignore - Cập nhật thời gian fetch cuối cùng
          scrollElement.lastFetchTime = now
          handleFetchNextPage()
        }
      }
    }, 200),
    [hasNextPage, isFetchingNextPage, handleFetchNextPage]
  )

  // Cleanup throttled functions when component unmounts
  useEffect(() => {
    return () => {
      handleScrollPosition.cancel()
      handleScrollForFetch.cancel()
    }
  }, [handleScrollPosition, handleScrollForFetch])

  const isGroupChat = data?.pages[0]?.conversation?.type === 'GROUP'

  const otherUser = useMemo(() => {
    if (!data?.pages[0]?.conversation || isGroupChat) return null

    const currentUserId = session?.user?._id
    const participant = data.pages[0].conversation.participants?.find((p: any) => p._id !== currentUserId)

    return participant || null
  }, [data?.pages, session?.user?._id, isGroupChat])

  // Cập nhật useEffect lắng nghe sự kiện nhận tin nhắn mới
  useEffect(() => {
    if (!socket || !chatId) return

    const handleReceiveMessage = (message: any) => {
      // Kiểm tra xem tin nhắn có thuộc về cuộc trò chuyện hiện tại không
      if (message.chatId !== chatId) return

      // Khi nhận được tin nhắn mới, xóa trạng thái typing của người gửi
      if (message.senderId && typingUsers[message.senderId]) {
        setTypingUsers((prev) => ({ ...prev, [message.senderId]: false }))
      }

      // Kiểm tra xem tin nhắn có tempId không và tempId đó có trong danh sách đã gửi không
      if (message.tempId && sentTempIds.has(message.tempId)) {
        // Cập nhật cache để thay thế tin nhắn tạm thời bằng tin nhắn thật
        queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
          if (!oldData) return oldData

          // Tìm và thay thế tin nhắn tạm thời trong cache
          const updatedPages = oldData.pages.map((page: any) => {
            if (!page.messages) return page

            const updatedMessages = page.messages.map((msg: any) => {
              if (msg._id === message.tempId) {
                // Thay thế tin nhắn tạm thời bằng tin nhắn thật
                return {
                  ...message,
                  senderId: message.senderId, // Giữ nguyên dạng string
                  senderInfo: {
                    _id: message.senderId,
                    name: session?.user?.name || 'You',
                    avatar: session?.user?.avatar || ''
                  },
                  status: MESSAGE_STATUS.DELIVERED
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

        // Xóa tempId khỏi danh sách đã gửi
        setSentTempIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(message.tempId)
          return newSet
        })

        // Cập nhật danh sách chat
        queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
        queryClient.invalidateQueries({ queryKey: ['ARCHIVED_CHAT_LIST'] })
        return
      }

      // Nếu không phải tin nhắn thay thế, thêm tin nhắn mới vào cache
      const isSentByCurrentUser = String(message.senderId) === String(session?.user?._id)

      // Xử lý thông tin người gửi
      let senderInfo

      // Nếu là người dùng hiện tại
      if (isSentByCurrentUser) {
        senderInfo = {
          _id: session?.user?._id,
          name: session?.user?.name || 'You',
          avatar: session?.user?.avatar || ''
        }
      }
      // Nếu là nhóm chat, tìm thông tin người gửi trong danh sách thành viên
      else if (isGroupChat) {
        const sender = data?.pages[0]?.conversation?.participants?.find((p: any) => p._id === message.senderId)
        console.log('SENDER: ', { sender })
        if (sender) {
          senderInfo = {
            _id: message.senderId,
            name: sender.name || 'User',
            avatar: sender.avatar || ''
          }
        } else {
          // Nếu không tìm thấy trong danh sách thành viên, sử dụng thông tin từ message
          senderInfo = {
            _id: message.senderId,
            name: message.senderName || 'User',
            avatar: message.senderAvatar || ''
          }
        }
      }
      // Nếu là chat 1-1, sử dụng otherUser
      else if (otherUser) {
        senderInfo = {
          _id: message.senderId,
          name: otherUser.name || 'User',
          avatar: otherUser.avatar || ''
        }
      }
      // Fallback
      else {
        senderInfo = {
          _id: message.senderId,
          name: message.senderName || 'User',
          avatar: message.senderAvatar || ''
        }
      }

      // Chuẩn bị tin nhắn với định dạng đúng
      const formattedMessage = {
        ...message,
        senderId: senderInfo,
        status: isSentByCurrentUser
          ? MESSAGE_STATUS.DELIVERED
          : isAtBottom && document.visibilityState === 'visible'
            ? MESSAGE_STATUS.SEEN
            : MESSAGE_STATUS.DELIVERED
      }

      // Thêm tin nhắn mới vào cache
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        // Tạo bản sao của trang đầu tiên và thêm tin nhắn mới
        const firstPage = { ...oldData.pages[0] }
        firstPage.messages = [...firstPage.messages, formattedMessage]

        return {
          ...oldData,
          pages: [firstPage, ...oldData.pages.slice(1)]
        }
      })

      // Nếu tin nhắn từ người khác và người dùng đang ở gần cuối, đánh dấu là đã đọc
      if (!isSentByCurrentUser && isAtBottom) {
        socket.emit(SOCKET_EVENTS.MARK_AS_READ, {
          chatId,
          messageIds: [message._id]
        })
      }

      // Chỉ cuộn xuống khi không đang tải tin nhắn cũ và người dùng đang ở gần cuối
      const scrollableDiv = document.getElementById('messageScrollableDiv')
      // Xác định isAtBottom ở đây để tránh lỗi
      const isNearBottom = scrollableDiv
        ? scrollableDiv.scrollHeight - scrollableDiv.scrollTop - scrollableDiv.clientHeight < 200
        : false

      if (!isFetchingNextPage && isNearBottom) {
        setTimeout(() => {
          if (scrollableDiv) {
            scrollableDiv.scrollTop = scrollableDiv.scrollHeight
          }
        }, 300)
      }
    }

    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage)

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage)
    }
  }, [socket, chatId, session?.user, sentTempIds, queryClient, isAtBottom, otherUser, data])

  const totalParticipantsCount = useMemo(() => {
    if (!data?.pages[0]?.conversation?.participants || !isGroupChat) return 0
    return data.pages[0].conversation.participants.filter((p: any) => p._id !== session?.user?._id).length
  }, [data?.pages[0]?.conversation?.participants, session?.user?._id])

  // Trong phần hiển thị thông tin chat
  const getChatInfo = useCallback(() => {
    if (!data?.pages[0]?.conversation) return { name: '', avatar: undefined }

    const conversation = data.pages[0].conversation

    // Nếu là group chat, sử dụng tên và avatar của nhóm
    if (conversation.type === 'GROUP') {
      return {
        name: conversation.name || 'Nhóm chat',
        avatar: conversation.avatar || undefined
      }
    }

    // Nếu là chat 1-1, lấy thông tin người dùng khác
    const currentUserId = session?.user?._id
    const otherParticipant = conversation.participants?.find((p: any) => p._id !== currentUserId)

    return {
      name: otherParticipant?.name || 'Unknown',
      avatar: otherParticipant?.avatar || undefined
    }
  }, [data?.pages, session?.user?._id])

  const fetchReadersInfo = async (messageId: string, readBy: string[]) => {
    if (!readBy || readBy.length === 0) return

    try {
      // Lấy thông tin tin nhắn để biết người gửi
      const message = filteredMessages.find((msg) => msg._id === messageId)
      if (!message) return

      // Xác định ID người gửi
      const senderId =
        typeof message.senderId === 'object' ? message.senderId._id.toString() : message.senderId.toString()

      // Lọc danh sách readBy để loại bỏ người gửi tin nhắn
      const filteredReadBy = readBy.filter((userId) => {
        return userId.toString() !== senderId
      })

      if (filteredReadBy.length === 0) {
        setMessageReaders((prev) => ({
          ...prev,
          [messageId]: []
        }))
        return
      }

      const promises = filteredReadBy.map(async (userId) => {
        try {
          const response = await httpRequest.get(`/user/${userId}`)
          return response.data.data
        } catch (error) {
          return { _id: userId, name: 'Unknown User', avatar: '' }
        }
      })

      const users = await Promise.all(promises)
      setMessageReaders((prev) => ({
        ...prev,
        [messageId]: users
      }))
    } catch (error) {
      console.error('Error fetching readers:', error)
    }
  }

  // Thêm các hàm xử lý cuộc gọi
  const handleStartAudioCall = () => {
    if (!otherUser?._id) {
      console.error('No recipient found')
      return
    }

    console.log('Starting audio call with:', otherUser)
    startCall({
      recipientId: otherUser._id,
      recipientName: otherUser.name || 'User',
      recipientAvatar: otherUser.avatar,
      chatId: chatId as string,
      callType: CALL_TYPE.AUDIO
    })
  }

  const handleStartVideoCall = () => {
    if (!otherUser?._id) {
      console.error('No recipient found')
      return
    }

    console.log('Starting video call with:', otherUser)
    startCall({
      recipientId: otherUser._id,
      recipientName: otherUser.name || 'User',
      recipientAvatar: otherUser.avatar,
      chatId: chatId as string,
      callType: CALL_TYPE.VIDEO
    })
  }

  // Nếu đang kiểm tra quyền truy cập hoặc không có quyền, hiển thị skeleton
  if (isCheckingAccess || !hasAccess) {
    return <ChatSkeleton />
  }

  return (
    <div className='sticky top-0 flex h-full max-h-[calc(100vh-64px)] flex-col'>
      <div className='flex items-center border-b p-2'>
        {isMobile && (
          <>
            <Button variant='ghost' size='icon' onClick={() => router.push('/messages')} className='mr-2'>
              <ArrowLeft className='h-5 w-5' />
              <span className='sr-only'>Back</span>
            </Button>
            <h2 className='text-lg font-semibold'>Tin nhắn</h2>
          </>
        )}
        <div className='flex-1'></div>
        <div className='flex items-center gap-2'>
          <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <Archive className='h-4 w-4' />
                <span className='sr-only'>{data?.pages[0]?.conversation?.isArchived ? 'Unarchive' : 'Archive'}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {data?.pages[0]?.conversation?.isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'} cuộc trò chuyện
                </DialogTitle>
                <DialogDescription>
                  {data?.pages[0]?.conversation?.isArchived
                    ? 'Bạn có chắc chắn muốn bỏ lưu trữ cuộc trò chuyện này?'
                    : 'Bạn có chắc chắn muốn lưu trữ cuộc trò chuyện này?'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant='outline'>Hủy</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    handleArchiveToggle()
                    setIsArchiveDialogOpen(false)
                  }}
                >
                  {data?.pages[0]?.conversation?.isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Các nút khác nếu có */}
        </div>
      </div>
      <Separator />
      {isLoading ? (
        <div className='flex h-[calc(100vh-64px)] flex-col space-y-4 p-4'>
          <Skeleton className='h-12 w-full' />
          <div className='flex items-center space-x-4'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-40' />
              <Skeleton className='h-4 w-24' />
            </div>
          </div>
          <Skeleton className='h-full w-full grow rounded-md' />
          <div className='flex space-x-2'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-10' />
          </div>
        </div>
      ) : (
        <div className='flex flex-1 flex-col'>
          <div className='flex items-start p-4'>
            <div className='flex flex-1 items-start gap-4 text-sm'>
              <Avatar className='h-8 w-8'>
                <AvatarImage src={getChatInfo().avatar} alt={getChatInfo().name} />
                <AvatarFallback>{getChatInfo().name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className='flex flex-1 items-center'>
                <div className='grid gap-1'>
                  <div className='flex items-center font-semibold'>
                    <div className='flex items-center gap-2'>{getChatInfo().name || 'Cuộc trò chuyện'}</div>
                  </div>
                  <div className='text-muted-foreground flex items-center text-xs'>
                    {isGroupChat ? (
                      // Hiển thị thông tin nhóm
                      <div className='flex items-center'>
                        <div
                          className={`mr-2 h-2 w-2 rounded-full ${
                            onlineUsers.size > 0 ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        ></div>
                        {onlineUsers.size > 0
                          ? `${onlineUsers.size} thành viên đang online`
                          : `${totalParticipantsCount + 1} thành viên`}
                      </div>
                    ) : (
                      // Hiển thị trạng thái online cho chat 1-1
                      <>
                        <div
                          className={`mr-2 h-2 w-2 rounded-full ${userStatus.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                        ></div>
                        {userStatus.isOnline ? 'Active now' : `Last active ${formatLastActive(userStatus.lastActive)}`}
                      </>
                    )}
                  </div>
                </div>
                {/* Action buttons - pushed to the right */}
                <div className='ml-auto flex items-center gap-2'>
                  <div className='flex items-center gap-2'>
                    {isGroupChat ? (
                      // Hiển thị nút cho nhóm chat
                      <>
                        <AddGroupMembersDialog
                          conversation={data?.pages[0]?.conversation}
                          key={`add-members-${chatId}`}
                        />
                        <GroupSettingsDialog
                          conversation={data?.pages[0]?.conversation}
                          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['MESSAGES', chatId] })}
                        />
                      </>
                    ) : (
                      // Hiển thị nút gọi và kết bạn cho chat 1-1
                      <>
                        {/* Nút gọi thoại */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={handleStartAudioCall}
                              disabled={!userStatus.isOnline}
                              title={userStatus.isOnline ? 'Gọi thoại' : 'Người dùng đang offline'}
                            >
                              <Phone className='h-5 w-5' />
                              <span className='sr-only'>Gọi thoại</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userStatus.isOnline ? 'Gọi thoại' : 'Người dùng đang offline'}
                          </TooltipContent>
                        </Tooltip>

                        {/* Nút gọi video */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={handleStartVideoCall}
                              disabled={!userStatus.isOnline}
                              title={userStatus.isOnline ? 'Gọi video' : 'Người dùng đang offline'}
                            >
                              <Video className='h-5 w-5' />
                              <span className='sr-only'>Gọi video</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userStatus.isOnline ? 'Gọi video' : 'Người dùng đang offline'}
                          </TooltipContent>
                        </Tooltip>

                        {otherUserId && (
                          <FriendActionButton
                            isLoading={isLoadingFriendStatus}
                            friendStatus={friendStatus}
                            otherUserId={otherUserId}
                            onStatusChange={() => {
                              refetchFriendStatus()
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Separator />
          {data?.pages[0]?.messages && (
            <PinnedMessages
              chatId={chatId as string}
              onScrollToMessage={scrollToMessage}
              fetchOlderMessages={fetchNextPage}
              hasMoreMessages={!!hasNextPage}
              isFetchingOlderMessages={isFetchingNextPage}
            />
          )}
          <div className='relative'>
            <div
              className='h-[calc(100vh-300px)] flex-1 overflow-y-auto'
              id='messageScrollableDiv'
              ref={scrollContainerRef}
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

                // Gọi các hàm xử lý đã được throttle
                handleScrollPosition(scrollTop, scrollHeight, clientHeight)
                handleScrollForFetch(e.currentTarget, scrollTop)
              }}
            >
              <div className='flex flex-col gap-2 p-4'>
                {isFetchingNextPage && (
                  <div className='flex justify-center p-4'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                  </div>
                )}

                {!hasNextPage && (
                  <div className='text-muted-foreground p-2 text-center text-xs'>Không còn tin nhắn cũ nào nữa</div>
                )}

                {/* Danh sách tin nhắn */}
                {filteredMessages?.map((msg, index) => {
                  // Nếu là tin nhắn hệ thống, hiển thị khác
                  if (msg.type === MESSAGE_TYPE.SYSTEM) {
                    return (
                      <div key={msg._id} className='text-muted-foreground my-4 text-center text-xs'>
                        {msg.content}
                      </div>
                    )
                  }

                  // Kiểm tra xem tin nhắn có phải của người dùng hiện tại không
                  const isSentByMe = isMessageFromCurrentUser(msg)

                  // Kiểm tra xem tin nhắn có phải là tin nhắn đầu tiên trong nhóm không
                  const isFirstMessageInGroup =
                    index === 0 || isMessageFromCurrentUser(filteredMessages[index - 1]) !== isSentByMe

                  // Kiểm tra xem tin nhắn có phải là tin nhắn cuối cùng trong nhóm không
                  const isLastMessageInGroup =
                    index === filteredMessages.length - 1 ||
                    isMessageFromCurrentUser(filteredMessages[index + 1]) !== isSentByMe

                  // Thêm margin bottom cho tin nhắn cuối cùng trong nhóm
                  const marginBottom = isLastMessageInGroup ? 'mb-4' : 'mb-1'

                  return (
                    <div
                      key={msg._id}
                      id={`message-${msg._id}`}
                      className={`${marginBottom} flex ${isSentByMe ? 'justify-end' : 'justify-start'} transition-colors duration-300`}
                    >
                      <div className='group relative max-w-[70%]'>
                        <div className={`flex items-end gap-2 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Chỉ hiển thị avatar cho tin nhắn đầu tiên trong nhóm */}
                          {isFirstMessageInGroup && !isSentByMe ? (
                            <FriendHoverCard friend={msg.senderId}>
                              <Avatar className='h-8 w-8 flex-shrink-0'>
                                <AvatarImage src={msg.senderId.avatar} alt={msg.senderId.name || 'User'} />
                                <AvatarFallback>
                                  {msg.senderId.name?.[0] || (msg.senderId.name ? msg.senderId.name.charAt(0) : 'U')}
                                </AvatarFallback>
                              </Avatar>
                            </FriendHoverCard>
                          ) : (
                            // Thêm div trống để giữ căn chỉnh khi không hiển thị avatar
                            !isSentByMe && <div className='w-8 flex-shrink-0'></div>
                          )}

                          <div
                            className={`rounded-xl px-3 py-2 text-sm ${
                              isSentByMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                            } ${isFirstMessageInGroup ? (isSentByMe ? 'rounded-tr-xl' : 'rounded-tl-xl') : isSentByMe ? 'rounded-r-xl' : 'rounded-l-xl'} relative`}
                          >
                            <HoverCard openDelay={100} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <div className='absolute inset-0 cursor-pointer' />
                              </HoverCardTrigger>
                              <HoverCardContent
                                className={`w-auto border-none bg-transparent p-0 shadow-none ${isSentByMe ? 'data-[side=top]:translate-x-1/2' : 'data-[side=top]:-translate-x-1/2'}`}
                                side={isSentByMe ? 'left' : 'right'}
                              >
                                <div className='flex gap-2'>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.content)
                                      toast.success('Đã sao chép tin nhắn', {
                                        duration: 2000
                                      })
                                    }}
                                  >
                                    <Copy className='h-4 w-4' />
                                    <span className='sr-only'>Copy</span>
                                  </Button>

                                  {/* Thêm nút reaction */}
                                  {hasUserReacted(msg) ? (
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      className='h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                                      onClick={() => handleRemoveReaction(msg._id)}
                                    >
                                      <Heart className='h-4 w-4 fill-red-500 text-red-500' />
                                      <span className='sr-only'>Unlike</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      className='h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                                      onClick={() => handleAddReaction(msg._id)}
                                    >
                                      <Heart className='h-4 w-4' />
                                      <span className='sr-only'>Like</span>
                                    </Button>
                                  )}

                                  {/* Xóa nút ghim trực tiếp ở đây vì đã có trong MessageActions */}
                                  {/* 
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                                    onClick={() => pinMessage(msg._id)}
                                  >
                                    {msg.isPinned ? <PinOff className='h-4 w-4' /> : <Pin className='h-4 w-4' />}
                                    <span className='sr-only'>{msg.isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
                                  </Button>
                                  */}

                                  {/* Thêm MessageActions component */}
                                  <MessageActions message={msg} chatId={chatId} isSentByMe={isSentByMe} />
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{msg.content}</div>
                            {/* Hiển thị reactions kiểu Instagram */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className='absolute right-0 bottom-0 translate-x-1/3 translate-y-1/2 transform'>
                                <Popover
                                  open={openReactionPopover === msg._id}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setOpenReactionPopover(msg._id)
                                      // Fetch thông tin người dùng khi mở popover
                                      fetchUserInfoForReactions(msg._id, msg.reactions)
                                    } else {
                                      setOpenReactionPopover(null)
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <div className='bg-background border-border flex cursor-pointer items-center rounded-full border px-2 py-0.5 text-xs shadow-sm'>
                                      <Heart className='mr-1 h-3 w-3 fill-red-500 text-red-500' />
                                      <span className='text-foreground font-medium'>{msg.reactions.length}</span>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className='w-60 p-0' side='top'>
                                    <div className='py-2'>
                                      <h4 className='px-3 py-1 text-sm font-medium'>
                                        Reactions ({msg.reactions.length})
                                      </h4>
                                      <div className='max-h-40 overflow-y-auto'>
                                        {msg.reactions.map((reaction: any, index: number) => {
                                          // Xác định thông tin người dùng từ reaction
                                          let user
                                          let isCurrentUser = false
                                          let userId = ''

                                          if (typeof reaction.userId === 'object' && reaction.userId._id) {
                                            userId = reaction.userId._id
                                            user = reaction.userId
                                            isCurrentUser = userId === session?.user?._id
                                          } else if (typeof reaction.userId === 'string') {
                                            userId = reaction.userId
                                            isCurrentUser = userId === session?.user?._id

                                            if (isCurrentUser) {
                                              user = {
                                                name: session?.user?.name || 'You',
                                                avatar: session?.user?.avatar
                                              }
                                            } else if (userInfoMap[userId]) {
                                              user = userInfoMap[userId]
                                            } else {
                                              user = { name: 'User', avatar: '' }
                                            }
                                          } else {
                                            user = { name: 'User', avatar: '' }
                                          }

                                          return (
                                            <div key={index} className='hover:bg-muted flex items-center px-3 py-2'>
                                              <Avatar className='mr-2 h-6 w-6'>
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback>{user.name?.[0] || '?'}</AvatarFallback>
                                              </Avatar>
                                              <span className='text-sm'>
                                                {isCurrentUser ? 'You' : user.name || 'User'}
                                              </span>
                                              <span className='ml-auto'>{reaction.type || '❤️'}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Hiển thị thời gian và trạng thái tin nhắn CHỈ khi là tin nhắn cuối cùng trong nhóm */}
                        {isLastMessageInGroup && (
                          <div
                            className={`text-muted-foreground mt-1.5 text-xs ${isSentByMe ? 'mr-1 text-end' : 'text-end'}`}
                          >
                            {formatTime(msg.createdAt)}
                            {isSentByMe && (
                              <span className='ml-2'>
                                {msg.status === MESSAGE_STATUS.SENT && <Check className='inline h-3 w-3' />}
                                {msg.status === MESSAGE_STATUS.DELIVERED && <Check className='inline h-3 w-3' />}
                                {msg.status === MESSAGE_STATUS.SEEN && (
                                  <>
                                    {isGroupChat ? (
                                      <Popover
                                        open={openReadersPopover === msg._id}
                                        onOpenChange={(open) => {
                                          if (open) {
                                            setOpenReadersPopover(msg._id)
                                            fetchReadersInfo(msg._id, msg.readBy || [])
                                          } else {
                                            setOpenReadersPopover(null)
                                          }
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <span className='cursor-pointer text-blue-500 hover:underline'>
                                            <CheckCheck className='inline h-3 w-3' />
                                            {msg.readBy && msg.readBy.length > 0 && (
                                              <span className='ml-1 text-xs'>
                                                (
                                                {msg.readBy.filter((id: any) => {
                                                  const senderId =
                                                    typeof msg.senderId === 'object'
                                                      ? msg.senderId._id.toString()
                                                      : msg.senderId.toString()
                                                  return id.toString() !== senderId
                                                })?.length || 0}
                                                )
                                              </span>
                                            )}
                                          </span>
                                        </PopoverTrigger>
                                        <PopoverContent className='w-60 p-0' side='top'>
                                          <div className='py-2'>
                                            <h4 className='px-3 py-1 text-sm font-medium'>
                                              Đã xem (
                                              {msg.readBy
                                                ? msg.readBy.filter((id: any) => {
                                                    const senderId =
                                                      typeof msg.senderId === 'object'
                                                        ? msg.senderId._id.toString()
                                                        : msg.senderId.toString()
                                                    return id.toString() !== senderId
                                                  }).length
                                                : 0}
                                              )
                                            </h4>
                                            <div className='max-h-40 overflow-y-auto'>
                                              {messageReaders[msg._id] ? (
                                                messageReaders[msg._id]
                                                  // Lọc ra những người không phải là người gửi tin nhắn
                                                  .filter((reader: any) => {
                                                    // Lấy ID của người gửi tin nhắn
                                                    const senderId =
                                                      typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId

                                                    // Chỉ hiển thị những người không phải là người gửi
                                                    return reader._id !== senderId
                                                  })
                                                  .map((reader: any) => (
                                                    <div
                                                      key={reader._id}
                                                      className='hover:bg-muted flex items-center px-3 py-2'
                                                    >
                                                      <Avatar className='mr-2 h-6 w-6'>
                                                        <AvatarImage src={reader.avatar} />
                                                        <AvatarFallback>{reader.name?.[0] || '?'}</AvatarFallback>
                                                      </Avatar>
                                                      <span className='text-sm'>{reader.name}</span>
                                                    </div>
                                                  ))
                                              ) : (
                                                <div className='text-muted-foreground px-3 py-2 text-sm'>
                                                  Đang tải...
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    ) : (
                                      <span className='text-blue-500'>
                                        <CheckCheck className='inline h-3 w-3' />
                                      </span>
                                    )}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Hiển thị hiệu ứng typing nếu có người đang nhập - đặt ở cuối danh sách tin nhắn */}
                {isAnyoneTyping && (
                  <div className='flex justify-start gap-2'>
                    {Object.entries(typingUsers).map(([userId, isTyping]) => {
                      if (!isTyping) return null

                      // Tìm thông tin người dùng từ danh sách participants
                      const typingUser = data?.pages[0]?.conversation?.participants?.find((p: any) => p._id === userId)

                      return (
                        <div key={userId} className='flex items-end gap-2'>
                          <Avatar className='h-8 w-8 flex-shrink-0'>
                            <AvatarImage src={typingUser?.avatar} alt={typingUser?.name || 'User'} />
                            <AvatarFallback>{typingUser?.name?.[0] || 'User'}</AvatarFallback>
                          </Avatar>
                          <div className='bg-muted flex cursor-pointer items-center rounded-full px-2 py-0.5 text-xs'>
                            <MessageLoading />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Scroll to bottom button - luôn hiển thị nhưng thay đổi opacity và transform */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  className='absolute right-4 bottom-4 z-10'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    onClick={scrollToBottom}
                    size='icon'
                    variant='secondary'
                    className='rounded-full shadow-md'
                    aria-label='Scroll to new messages'
                  >
                    <ArrowDown className='h-4 w-4' />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Separator className='mt-auto' />

          {/* Hiển thị thông báo khi không có quyền gửi tin nhắn */}
          {/* {!canSendMessages && sendPermission && (
            <div className='bg-muted/50 border-primary/20 mx-4 mt-2 rounded-md border-l-2 p-2 text-sm'>
              {sendPermission.isMuted ? (
                <p>
                  Bạn đã bị cấm chat
                  {sendPermission.mutedUntil && (
                    <span className='block text-xs'>
                      Đến: {format(new Date(sendPermission.mutedUntil), 'PPP HH:mm', { locale: vi })}
                    </span>
                  )}
                </p>
              ) : sendPermission.restrictedByGroupSettings ? (
                <p>
                  Chỉ quản trị viên mới có thể gửi tin nhắn
                  {sendPermission.restrictUntil && (
                    <span className='block text-xs'>
                      Đến: {format(new Date(sendPermission.restrictUntil), 'PPP HH:mm', { locale: vi })}
                    </span>
                  )}
                </p>
              ) : (
                <p>Bạn không có quyền gửi tin nhắn trong nhóm này</p>
              )}
            </div>
          )} */}

          <div className='p-4'>
            <div className='flex items-end gap-4'>
              <Input
                className='flex-1 resize-none rounded-full p-4'
                placeholder={
                  isBlockedByUser
                    ? 'Bạn không thể gửi tin nhắn cho người dùng này vì họ đã chặn bạn'
                    : !canSendMessages
                      ? sendPermission?.isMuted
                        ? `Bị cấm chat${
                            sendPermission.mutedUntil
                              ? ` đến ${format(new Date(sendPermission.mutedUntil), 'dd/MM/yyyy')}`
                              : ''
                          }`
                        : sendPermission?.restrictedByGroupSettings
                          ? `Chỉ admin được gửi tin nhắn${
                              sendPermission.restrictUntil
                                ? ` đến ${format(new Date(sendPermission.restrictUntil), 'dd/MM/yyyy')}`
                                : ''
                            }`
                          : 'Không có quyền gửi tin nhắn'
                      : 'Nhập tin nhắn...'
                }
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                disabled={!canSendMessages || isBlockedByUser}
              />
              {message.trim() && canSendMessages ? (
                <Button onClick={handleSendMessage} size='icon' className='rounded-full'>
                  <Send className='h-5 w-5' />
                </Button>
              ) : (
                <Button
                  onClick={handleSendHeartEmoji}
                  variant='outline'
                  size='icon'
                  className='rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30'
                  disabled={!canSendMessages || isBlockedByUser}
                >
                  <Heart className='h-5 w-5 fill-pink-500 text-pink-500' />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(ChatDetail), {
  ssr: false,
  loading: () => <ChatSkeleton />
})
