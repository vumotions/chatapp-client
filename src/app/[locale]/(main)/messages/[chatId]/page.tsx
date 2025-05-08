'use client'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Archive,
  ArrowDown,
  Check,
  CheckCheck,
  Copy,
  Heart,
  MoreVertical,
  Phone,
  Trash2,
  UserPlus,
  Video
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Separator } from '~/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

import dynamic from 'next/dynamic'
import { use } from 'react'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { useMarkChatAsRead, useMessages } from '~/hooks/data/chat.hooks'
import { useSocket } from '~/hooks/use-socket'

import { useQueryClient } from '@tanstack/react-query'
import { vi } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import httpRequest from '~/config/http-request'
import { CHAT_TYPE, FRIEND_REQUEST_STATUS, MEDIA_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useRemoveFriendMutation,
  useSendFriendRequestMutation
} from '~/hooks/data/friends.hook'
import friendService from '~/services/friend.service'

const DEFAULT_AVATAR = '/images/default-avatar.png'

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

interface ChatInfo {
  _id: string
  userId: string
  type: CHAT_TYPE
  name?: string
  avatar?: string
  lastMessage?: string
  participants: string[]
  read: boolean
  createdAt: string
  updatedAt: string
}

interface PageData {
  messages: Message[]
  chat: {
    _id: string
    name?: string
    avatar?: string
    type: string
    participants: string[]
    createdAt: string
  }
  hasMore: boolean
}

function ChatDetail({ params }: Props) {
  // 1. Tất cả các state và ref
  const { chatId } = use(params)
  const [message, setMessage] = useState('')
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [sentTempIds, setSentTempIds] = useState<Set<string>>(new Set())
  const [friendStatus, setFriendStatus] = useState<FRIEND_REQUEST_STATUS | 'RECEIVED' | null>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [isFriend, setIsFriend] = useState(false)
  const [userStatus, setUserStatus] = useState<{
    isOnline: boolean
    lastActive: string | null
  }>({
    isOnline: false,
    lastActive: null
  })
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  // Thêm state để lưu trữ thông tin người dùng
  const [userInfoMap, setUserInfoMap] = useState<Record<string, { name: string; avatar: string }>>({})
  // Thêm state để theo dõi việc hiển thị popover reactions
  const [openReactionPopover, setOpenReactionPopover] = useState<string | null>(null)

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

  // Friend request mutations
  const sendFriendRequest = useSendFriendRequestMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const acceptFriendRequest = useAcceptFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const { socket } = useSocket()
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(chatId)
  const { mutate: markAsRead } = useMarkChatAsRead()
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  // Kiểm tra xem có ai đang typing không
  const isAnyoneTyping = useMemo(() => {
    return Object.values(typingUsers).some(Boolean)
  }, [typingUsers])

  // Kiểm tra xem hai tin nhắn có phải từ cùng một người gửi không
  const isSameUser = (message1: any, message2: any) => {
    // Kiểm tra cấu trúc của senderId
    const senderId1 = typeof message1.senderId === 'object' ? message1.senderId._id : message1.senderId
    const senderId2 = typeof message2.senderId === 'object' ? message2.senderId._id : message2.senderId

    return String(senderId1) === String(senderId2)
  }

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

      console.log('Revalidating messages for chat:', chatId)
    }
  }, [chatId, markAsRead])

  // Scroll to bottom on first load or when new message arrives
  useEffect(() => {
    // Nếu đang tải tin nhắn cũ, không cuộn xuống
    if (isFetchingNextPage) {
      console.log('Skip scrolling because loading old messages')
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

    // Kiểm tra trạng thái kết nối
    console.log('Socket connection status:', socket.connected)

    // Tham gia vào room chat
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { chatId })
    console.log('Joining room:', chatId)
  }, [socket, chatId])

  // Cập nhật useEffect lắng nghe sự kiện nhận tin nhắn mới
  useEffect(() => {
    if (!socket || !chatId) return

    const handleReceiveMessage = (message: any) => {
      console.log('Received message:', message)

      // Kiểm tra xem tin nhắn có thuộc về chat hiện tại không
      if (message.chatId !== chatId) {
        console.log('Message is for a different chat, skipping')
        return
      }

      // Kiểm tra xem tin nhắn có tempId không và tempId đó có trong danh sách đã gửi không
      if (message.tempId && sentTempIds.has(message.tempId)) {
        console.log('Replacing temp message with real message, tempId:', message.tempId)

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
                  senderId: {
                    _id: message.senderId,
                    name: session?.user?.name,
                    avatar: session?.user?.avatar
                  }
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

        return // Thoát khỏi hàm sau khi thay thế
      }

      // Nếu không phải tin nhắn thay thế, thêm tin nhắn mới vào cache
      const isSentByCurrentUser = String(message.senderId) === String(session?.user?._id)

      // Chuẩn bị tin nhắn với định dạng đúng
      const formattedMessage = {
        ...message,
        senderId: {
          _id: message.senderId,
          name: isSentByCurrentUser ? session?.user?.name : message.senderName || 'User',
          avatar: isSentByCurrentUser ? session?.user?.avatar : message.senderAvatar
        }
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

      // Chỉ cuộn xuống khi không đang tải tin nhắn cũ và người dùng đang ở gần cuối
      const scrollableDiv = document.getElementById('messageScrollableDiv')
      const isAtBottom = scrollableDiv
        ? scrollableDiv.scrollHeight - scrollableDiv.scrollTop - scrollableDiv.clientHeight < 200
        : false

      if (!isFetchingNextPage && isAtBottom) {
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
  }, [socket, chatId, session?.user, sentTempIds, queryClient])

  // Lắng nghe sự kiện typing từ người dùng khác
  useEffect(() => {
    if (!socket || !chatId) return

    console.log('Setting up typing event listeners for chatId:', chatId)

    const handleTypingStart = (data: { userId: string; chatId: string }) => {
      console.log('TYPING_START received:', data)
      if (data.chatId === chatId && data.userId !== session?.user?._id) {
        // Sử dụng functional update để đảm bảo state luôn được cập nhật chính xác
        setTypingUsers((prev) => ({ ...prev, [data.userId]: true }))
      }
    }

    const handleTypingStop = (data: { userId: string; chatId: string }) => {
      console.log('TYPING_STOP received:', data)
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
    console.log('InfiniteScroll triggered next function')

    if (!hasNextPage || isFetchingNextPage) {
      console.log('Skipping fetch due to:', { hasNextPage, isFetchingNextPage })
      return
    }

    console.log('Fetching next page...')

    // Lưu vị trí cuộn hiện tại
    const scrollableDiv = document.getElementById('messageScrollableDiv')
    const scrollPosition = scrollableDiv?.scrollTop || 0
    const scrollHeight = scrollableDiv?.scrollHeight || 0

    fetchNextPage()
      .then(() => {
        console.log('Fetch completed successfully')
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

  // Thêm useEffect để lấy trạng thái kết bạn
  useEffect(() => {
    const fetchFriendStatus = async () => {
      if (!otherUserId) return

      try {
        const response = await friendService.getFriendStatus(otherUserId)
        const status = response.data.data.status

        console.log('Friend status fetched:', status)

        setFriendStatus(status as FRIEND_REQUEST_STATUS)
        setIsFriend(status === FRIEND_REQUEST_STATUS.ACCEPTED)
      } catch (error) {
        console.error('Error fetching friend status:', error)
      }
    }

    if (otherUserId) {
      fetchFriendStatus()
    }
  }, [otherUserId])

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

    const otherUser = data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)

    if (!otherUser) return

    // Lắng nghe sự kiện online
    socket.on(SOCKET_EVENTS.USER_ONLINE, (userId: string) => {
      if (userId === otherUser._id) {
        setUserStatus({
          isOnline: true,
          lastActive: new Date().toISOString()
        })
      }
    })

    // Lắng nghe sự kiện offline
    socket.on(SOCKET_EVENTS.USER_OFFLINE, (userId: string, lastActiveTime: string) => {
      if (userId === otherUser._id) {
        setUserStatus({
          isOnline: false,
          lastActive: lastActiveTime
        })
      }
    })

    // Kiểm tra trạng thái online ban đầu
    socket.emit(SOCKET_EVENTS.CHECK_ONLINE, otherUser._id, (isUserOnline: boolean, lastActiveTime: string) => {
      setUserStatus({
        isOnline: isUserOnline,
        lastActive: lastActiveTime
      })
    })

    return () => {
      socket.off(SOCKET_EVENTS.USER_ONLINE)
      socket.off(SOCKET_EVENTS.USER_OFFLINE)
    }
  }, [socket, chatId, data])

  // Thêm useEffect để theo dõi thay đổi của isOnline và lastActive
  useEffect(() => {
    console.log('Online status changed:', userStatus.isOnline, 'Last active:', userStatus.lastActive)
  }, [userStatus.isOnline, userStatus.lastActive])

  // Thêm useEffect để đánh dấu tin nhắn đã đọc khi người dùng xem
  useEffect(() => {
    if (!socket || !chatId || !allMessages.length || !isAtBottom) return

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
    }
  }, [socket, chatId, allMessages, isAtBottom, queryClient])

  // Thêm useEffect để lắng nghe sự kiện tin nhắn đã đọc
  useEffect(() => {
    if (!socket || !chatId) return

    const handleMessageRead = (data: { chatId: string; messageIds: string[] }) => {
      if (data.chatId !== chatId) return

      // Cập nhật cache để đánh dấu tin nhắn đã đọc
      queryClient.setQueryData(['MESSAGES', chatId], (oldData: any) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.messages) return page

          const updatedMessages = page.messages.map((msg: any) => {
            if (data.messageIds.includes(msg._id)) {
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

  // 4. Tất cả các hàm xử lý sự kiện
  // Hàm kiểm tra xem tin nhắn có phải do người dùng hiện tại gửi không
  const isMessageFromCurrentUser = (message: any) => {
    const currentUserId = session?.user?._id || session?.user?._id

    // Kiểm tra cấu trúc của senderId
    if (typeof message.senderId === 'object' && message.senderId._id) {
      return String(message.senderId._id) === String(currentUserId)
    } else {
      return String(message.senderId) === String(currentUserId)
    }
  }

  // Thêm các hàm xử lý
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)

    // Nếu người dùng chưa đang trong trạng thái typing, gửi sự kiện typing start
    if (!isTyping) {
      setIsTyping(true)
      socket?.emit(SOCKET_EVENTS.TYPING, {
        chatId,
        isTyping: true
      })
    }

    // Clear timeout trước đó nếu có
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current)
    }

    // Đặt timeout mới để debounce việc gửi sự kiện typing
    typingDebounceRef.current = setTimeout(() => {
      // Sau khi người dùng ngừng gõ trong 1 khoảng thời gian, gửi sự kiện typing stop
      setIsTyping(false)
      socket?.emit(SOCKET_EVENTS.TYPING, {
        chatId,
        isTyping: false
      })
    }, 2000)
  }

  const handleSendMessage = () => {
    if (!message.trim()) return

    // Dừng trạng thái typing
    if (isTyping) {
      setIsTyping(false)
      socket?.emit(SOCKET_EVENTS.TYPING, {
        chatId,
        isTyping: false
      })

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
      tempId, // Gửi tempId để server có thể trả lại trong tin nhắn thật
      senderName: session?.user?.name,
      senderAvatar: session?.user?.avatar
    })

    setMessage('')
    setShowScrollButton(false) // Hide the button when sending a message

    // Cuộn xuống
    setTimeout(() => {
      scrollToBottom()
    }, 100)
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
    if (!lastActiveTime) return 'now'

    const lastActive = new Date(lastActiveTime)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'yesterday'

    return `${diffInDays} days ago`
  }

  // Thêm biến otherUser để lưu thông tin người dùng khác
  const otherUser = useMemo(() => {
    if (!data?.pages[0]?.conversation?.participants) return null
    return data.pages[0].conversation.participants.find((p: { _id: string }) => p._id !== session?.user?._id) || null
  }, [data?.pages[0]?.conversation?.participants, session?.user?._id])

  // Thêm biến friendIconElement để hiển thị trạng thái bạn bè
  const friendIconElement = useMemo(() => {
    if (!otherUser) return null

    // Logic hiển thị icon trạng thái bạn bè
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='ml-2'>
            <UserPlus className='text-muted-foreground h-3.5 w-3.5' />
          </div>
        </TooltipTrigger>
        <TooltipContent>Thêm bạn bè</TooltipContent>
      </Tooltip>
    )
  }, [otherUser, friendStatus, isFriend])

  // Thêm hàm xử lý thả tim với log để debug
  const handleAddReaction = (messageId: string) => {
    console.log('Sending reaction for message:', messageId)

    if (!socket) {
      console.error('Socket not connected')
      return
    }

    socket.emit(SOCKET_EVENTS.ADD_REACTION, {
      messageId,
      reactionType: '❤️'
    })
  }

  // Thêm hàm xử lý xóa tim với log để debug
  const handleRemoveReaction = (messageId: string) => {
    console.log('Removing reaction for message:', messageId)

    if (!socket) {
      console.error('Socket not connected')
      return
    }

    socket.emit(SOCKET_EVENTS.REMOVE_REACTION, {
      messageId
    })
  }

  // Hàm kiểm tra xem người dùng hiện tại đã thả tim chưa
  const hasUserReacted = (message: any) => {
    if (!message.reactions || !Array.isArray(message.reactions)) return false

    return message.reactions.some(
      (reaction: any) =>
        (typeof reaction.userId === 'object' && reaction.userId._id === session?.user?._id) ||
        reaction.userId === session?.user?._id
    )
  }

  // Thêm listener cho lỗi socket
  useEffect(() => {
    if (!socket) return

    const handleError = (error: any) => {
      console.error('Socket error:', error)
      toast.error(error.message || 'Có lỗi xảy ra')
    }

    socket.on(SOCKET_EVENTS.ERROR, handleError)

    return () => {
      socket.off(SOCKET_EVENTS.ERROR, handleError)
    }
  }, [socket])

  if (isError) {
    return <div className='flex h-full items-center justify-center p-4'>Failed to fetch messages</div>
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
            avatar: userData?.avatar || DEFAULT_AVATAR
          }
        }))
      } catch (error) {
        console.error(`Error fetching info for user ${userId}:`, error)
        // Fallback
        setUserInfoMap((prev) => ({
          ...prev,
          [userId]: {
            name: 'User',
            avatar: DEFAULT_AVATAR
          }
        }))
      }
    })

    // Chờ tất cả các request hoàn thành
    await Promise.all(fetchPromises)
  }

  return (
    <div className='sticky top-0 flex h-full max-h-[calc(100vh-64px)] flex-col'>
      <div className='flex items-center p-2'>
        <div className='flex items-center gap-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <Archive className='h-4 w-4' />
                <span className='sr-only'>Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <Trash2 className='h-4 w-4' />
                <span className='sr-only'>Move to trash</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>{' '}
        </div>
        <Separator orientation='vertical' className='mx-2 h-6' />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' disabled={!chatId} className='ml-auto'>
              <MoreVertical className='h-4 w-4' />
              <span className='sr-only'>More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem>Star thread</DropdownMenuItem>
            <DropdownMenuItem>Add label</DropdownMenuItem>
            <DropdownMenuItem>Mute thread</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              <Avatar>
                {/* Đối với chat riêng tư, hiển thị avatar của người còn lại */}
                <AvatarImage
                  src={
                    data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)?.avatar
                  }
                  alt={data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)?.name}
                />
                <AvatarFallback>
                  {data?.pages[0]?.conversation?.participants
                    ?.find((p: any) => p._id !== session?.user?._id)
                    ?.name?.split(' ')
                    .map((chunk: string) => chunk[0])
                    .join('') || '?'}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-1 items-center'>
                <div className='grid gap-1'>
                  <div className='flex items-center font-semibold'>
                    <div className='flex items-center gap-2'>
                      {data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)
                        ?.name || 'Cuộc trò chuyện'}

                      {/* Friend status icon - close to username */}
                      {friendIconElement}
                    </div>
                  </div>
                  <div className='text-muted-foreground flex items-center text-xs'>
                    <div
                      className={`mr-2 h-2 w-2 rounded-full ${userStatus.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                    ></div>
                    {userStatus.isOnline ? 'Active now' : `Last active ${formatLastActive(userStatus.lastActive)}`}
                  </div>
                </div>
                {/* Action buttons - pushed to the right */}
                <div className='ml-auto flex items-center gap-2'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant='ghost' size='icon' className='h-6 w-6 p-4'>
                        <Phone className='h-4 w-4' />
                        <span className='sr-only'>Gọi điện</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gọi điện</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant='ghost' size='icon' className='h-6 w-6 p-4'>
                        <Video className='h-4 w-4' />
                        <span className='sr-only'>Gọi video</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gọi video</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
          <Separator />
          <div className='relative'>
            <div
              className='h-[calc(100vh-250px)] flex-1 overflow-y-auto'
              id='messageScrollableDiv'
              style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

                // Check if user is at bottom (within 100px)
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
                setIsAtBottom(isNearBottom)

                // Show scroll button when not near bottom
                setShowScrollButton(!isNearBottom)

                // Existing scroll logic for loading older messages
                const now = Date.now()
                // @ts-ignore - Thêm thuộc tính tạm thời vào element
                const lastFetchTime = e.currentTarget.lastFetchTime || 0
                const FETCH_COOLDOWN = 1000 // 1 giây cooldown

                // Nếu cuộn gần đến đầu và có thêm dữ liệu, tải thêm
                if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
                  // Chỉ fetch nếu đã qua thời gian cooldown
                  if (now - lastFetchTime > FETCH_COOLDOWN) {
                    // @ts-ignore - Cập nhật thời gian fetch cuối cùng
                    e.currentTarget.lastFetchTime = now
                    handleFetchNextPage()
                  }
                }
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
                {allMessages?.map((msg, index) => {
                  const isSentByMe = msg.senderId._id === session?.user?._id

                  // Kiểm tra xem tin nhắn có phải là tin nhắn đầu tiên trong nhóm không
                  const isFirstMessageInGroup = index === 0 || allMessages[index - 1]?.senderId._id !== msg.senderId._id

                  // Kiểm tra xem tin nhắn có phải là tin nhắn cuối cùng trong nhóm không
                  const isLastMessageInGroup =
                    index === allMessages.length - 1 || allMessages[index + 1]?.senderId._id !== msg.senderId._id

                  // Tính toán margin bottom - giảm khoảng cách giữa các tin nhắn
                  const marginBottom = isLastMessageInGroup ? 'mb-2' : 'mb-0.5'

                  return (
                    <div
                      key={msg._id}
                      className={`${marginBottom} flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className='group relative max-w-[70%]'>
                        <div className={`flex items-end gap-2 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Chỉ hiển thị avatar cho tin nhắn đầu tiên trong nhóm */}
                          {isFirstMessageInGroup && !isSentByMe ? (
                            <Avatar className='h-8 w-8 flex-shrink-0'>
                              <AvatarImage
                                src={msg.senderId.avatar || DEFAULT_AVATAR}
                                alt={msg.senderId.name || 'User'}
                              />
                              <AvatarFallback>{msg.senderId.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                          ) : (
                            // Thêm div trống để giữ căn chỉnh khi không hiển thị avatar
                            !isSentByMe && <div className='w-8 flex-shrink-0'></div>
                          )}

                          <div
                            className={`rounded-xl px-3 py-2 text-sm ${
                              isSentByMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                            } ${isFirstMessageInGroup ? (isSentByMe ? 'rounded-tr-xl' : 'rounded-tl-xl') : isSentByMe ? 'rounded-r-xl' : 'rounded-l-xl'} relative`}
                          >
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
                                                avatar: session?.user?.avatar || DEFAULT_AVATAR
                                              }
                                            } else if (userInfoMap[userId]) {
                                              user = userInfoMap[userId]
                                            } else {
                                              user = { name: 'User', avatar: DEFAULT_AVATAR }
                                            }
                                          } else {
                                            user = { name: 'User', avatar: DEFAULT_AVATAR }
                                          }

                                          return (
                                            <div key={index} className='hover:bg-muted flex items-center px-3 py-2'>
                                              <Avatar className='mr-2 h-6 w-6'>
                                                <AvatarImage src={user.avatar || DEFAULT_AVATAR} />
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

                        {/* Hiển thị thời gian và trạng thái tin nhắn */}
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
                                  <CheckCheck className='inline h-3 w-3 text-blue-500' />
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hiển thị nút copy và reaction khi hover */}
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
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/10'
                                onClick={() => {
                                  if (hasUserReacted(msg)) {
                                    handleRemoveReaction(msg._id)
                                  } else {
                                    handleAddReaction(msg._id)
                                  }
                                }}
                              >
                                <Heart
                                  className={`h-6 w-6 ${hasUserReacted(msg) ? 'fill-red-500 text-red-500' : ''}`}
                                />
                              </Button>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    </div>
                  )
                })}

                {/* Hiển thị hiệu ứng typing nếu có người đang nhập - đặt ở cuối danh sách tin nhắn */}
                {isAnyoneTyping && (
                  <div className={`flex gap-2 ${!otherUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className='h-8 w-8 flex-shrink-0'>
                      <AvatarImage src={otherUser?.avatar || DEFAULT_AVATAR} alt={otherUser?.name || 'User'} />
                      <AvatarFallback>{otherUser?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className='bg-muted flex cursor-pointer items-center rounded-full px-2 py-0.5 text-xs'>
                      <span>...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Scroll to bottom button - đặt bên ngoài container scroll nhưng vẫn trong container relative */}
            {showScrollButton && (
              <Button
                onClick={scrollToBottom}
                size='icon'
                variant='secondary'
                className='absolute right-4 bottom-4 z-10 rounded-full shadow-md'
                aria-label='Scroll to new messages'
              >
                <ArrowDown className='h-4 w-4' />
              </Button>
            )}
          </div>
          <Separator className='mt-auto' />
          <div className='p-4'>
            <div className='flex items-end gap-4'>
              <Input
                className='flex-1 resize-none p-4'
                placeholder='Nhập tin nhắn...'
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
              />
              <Button onClick={handleSendMessage}>Gửi</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(ChatDetail), {
  ssr: false,
  loading: () => (
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
  )
})
