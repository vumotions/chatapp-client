'use client'

import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Archive } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { ConversationActions } from '~/components/ui/chat/conversation-actions'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'
import { cn } from '~/lib/utils'

interface ConversationItemProps {
  conversation: any
  isActive?: boolean
  onClick?: () => void
  isArchived?: boolean
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function ConversationItem({
  conversation,
  isActive = false,
  onClick,
  isArchived = false
}: ConversationItemProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { socket } = useSocket()
  const [isOnline, setIsOnline] = useState(false)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // Kiểm tra xem người dùng có đang ở trong cuộc trò chuyện này không
  const isUserInConversation = pathname?.includes(`/messages/${conversation._id}`)

  // Xác định tên và avatar của cuộc trò chuyện
  let name = conversation.name
  let avatar = conversation.avatar
  // Nếu là chat riêng tư, hiển thị thông tin của người dùng khác
  if (conversation.type === 'PRIVATE' && conversation.participants) {
    const otherUser = conversation.participants.find((p: any) => p._id !== session?.user?._id)
    if (otherUser) {
      name = otherUser.name
      avatar = otherUser.avatar
    }
  }
  // Kiểm tra xem cuộc trò chuyện có đang chờ xóa không
  if (conversation.pendingDeletion) {
    return null // Ẩn cuộc trò chuyện đang chờ xóa
  }

  // Xác định người dùng khác trong cuộc trò chuyện
  useEffect(() => {
    if (conversation.type === 'PRIVATE' && conversation.participants) {
      const otherUser = conversation.participants.find((p: any) => p._id !== session?.user?._id)
      if (otherUser) {
        setOtherUserId(otherUser._id)
      }
    }
  }, [conversation, session])

  // Kiểm tra trạng thái online ban đầu và lắng nghe sự kiện online/offline
  useEffect(() => {
    if (!socket) return

    if (conversation.type === 'PRIVATE' && otherUserId) {
      console.log('Checking online status for user:', otherUserId)

      // Kiểm tra trạng thái online ban đầu cho chat riêng tư
      socket.emit(SOCKET_EVENTS.CHECK_ONLINE, otherUserId, (isUserOnline: boolean, lastActiveTime: string) => {
        console.log('Online status for user:', otherUserId, isUserOnline)
        setIsOnline(isUserOnline)
      })

      // Lắng nghe sự kiện online
      const handleUserOnline = (userId: string) => {
        console.log('User online event:', userId, otherUserId)
        if (userId === otherUserId) {
          setIsOnline(true)
        }
      }

      // Lắng nghe sự kiện offline
      const handleUserOffline = (userId: string) => {
        console.log('User offline event:', userId, otherUserId)
        if (userId === otherUserId) {
          setIsOnline(false)
        }
      }

      socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
      socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)

      return () => {
        socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
        socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)
      }
    } else if (conversation.type === 'GROUP' && conversation.participants) {
      // Kiểm tra trạng thái online của tất cả thành viên trong nhóm
      const participants = conversation.participants.filter((p: any) => p._id !== session?.user?._id)

      // Kiểm tra trạng thái online ban đầu cho tất cả thành viên
      participants.forEach((participant: any) => {
        socket.emit(SOCKET_EVENTS.CHECK_ONLINE, participant._id, (isUserOnline: boolean) => {
          if (isUserOnline) {
            setOnlineUsers((prev) => new Set([...prev, participant._id]))
            setIsOnline(true)
          }
        })
      })

      // Lắng nghe sự kiện online cho group
      const handleGroupUserOnline = (userId: string) => {
        const isGroupMember = participants.some((p: any) => p._id === userId)
        if (isGroupMember) {
          setOnlineUsers((prev) => new Set([...prev, userId]))
          setIsOnline(true)
        }
      }

      // Lắng nghe sự kiện offline cho group
      const handleGroupUserOffline = (userId: string) => {
        setOnlineUsers((prev) => {
          const newSet = new Set([...prev])
          newSet.delete(userId)
          // Nếu không còn ai online, cập nhật trạng thái
          if (newSet.size === 0) {
            setIsOnline(false)
          }
          return newSet
        })
      }

      socket.on(SOCKET_EVENTS.USER_ONLINE, handleGroupUserOnline)
      socket.on(SOCKET_EVENTS.USER_OFFLINE, handleGroupUserOffline)

      return () => {
        socket.off(SOCKET_EVENTS.USER_ONLINE, handleGroupUserOnline)
        socket.off(SOCKET_EVENTS.USER_OFFLINE, handleGroupUserOffline)
      }
    }
  }, [socket, otherUserId, conversation.type, conversation.participants, session?.user?._id])

  // Join room khi component mount
  useEffect(() => {
    if (!socket || !conversation._id) return

    // Join vào room của conversation
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, conversation._id)

    // Lắng nghe sự kiện tin nhắn mới
    const handleNewMessage = (message: any) => {
      console.log('Received new message in conversation-item:', message)

      if (message.chatId === conversation._id) {
        console.log('Updating lastMessage for conversation:', conversation._id)

        // Cập nhật tất cả các query có key bắt đầu bằng CHAT_LIST
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['CHAT_LIST'] })
          .forEach((query) => {
            queryClient.setQueryData(query.queryKey, (oldData: any) => {
              if (!oldData) {
                return oldData
              }

              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  conversations: page.conversations.map((conv: any) => {
                    if (conv._id === conversation._id) {
                      return {
                        ...conv,
                        lastMessage: message,
                        updatedAt: message.createdAt
                      }
                    }
                    return conv
                  })
                }))
              }
            })
          })

        // Invalidate tất cả các query có key bắt đầu bằng CHAT_LIST
        queryClient.invalidateQueries({
          queryKey: ['CHAT_LIST'],
          exact: false
        })
      }
    }

    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleNewMessage)

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleNewMessage)
    }
  }, [socket, conversation._id, queryClient])

  // Format thời gian của tin nhắn cuối cùng
  const formatTime = (dateString: string) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()

    // Nếu là ngày hôm nay, hiển thị giờ
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Nếu trong tuần này, hiển thị tên ngày
    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(date, { addSuffix: true, locale: vi })
    }

    // Nếu xa hơn, hiển thị ngày tháng
    return date.toLocaleDateString()
  }

  // Xác định nếu tin nhắn chưa đọc - nếu người dùng đang ở trong cuộc trò chuyện, coi như đã đọc
  // Thêm kiểm tra: nếu tin nhắn cuối cùng do chính người dùng hiện tại gửi, coi như đã đọc
  const isUnread =
    !conversation.read &&
    !isArchived &&
    !isUserInConversation &&
    conversation.lastMessage?.senderId?._id !== session?.user?._id &&
    conversation.lastMessage?.senderId !== session?.user?._id

  // Tự động đánh dấu đã đọc khi người dùng đang ở trong cuộc trò chuyện
  useEffect(() => {
    if (isUserInConversation && !conversation.read && socket) {
      // Chỉ đánh dấu đã đọc nếu tin nhắn cuối cùng KHÔNG phải do người dùng hiện tại gửi
      const lastMessageSenderId = conversation.lastMessage?.senderId?._id || conversation.lastMessage?.senderId
      const currentUserId = session?.user?._id

      if (lastMessageSenderId !== currentUserId) {
        // Gửi sự kiện đánh dấu đã đọc
        socket.emit(SOCKET_EVENTS.MARK_AS_READ, {
          chatId: conversation._id,
          messageIds: conversation.lastMessage ? [conversation.lastMessage._id] : []
        })
      }
    }
  }, [isUserInConversation, conversation.read, conversation._id, conversation.lastMessage, socket, session])

  return (
    <div
      className={cn('hover:bg-accent group flex cursor-pointer items-center rounded-md p-2 transition-colors', {
        'bg-accent': isActive && !isArchived,
        'opacity-80': isArchived
      })}
      onClick={onClick}
    >
      <div className='relative'>
        <Avatar className='h-10 w-10'>
          <AvatarImage
            src={avatar}
            alt={name}
            onError={(e) => {
              console.error('Avatar load error for URL:', avatar)
            }}
          />
          <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div
          className={`border-background absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      </div>
      <div className='ml-3 flex-1 overflow-hidden'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            <h3 className={cn('text-sm', isUnread ? 'text-primary font-bold' : 'text-foreground font-medium')}>
              {name}
            </h3>
            {isArchived && <Archive className='text-muted-foreground ml-1 h-3 w-3' />}
          </div>
          <p className={cn('text-xs', isUnread ? 'text-primary font-medium' : 'text-muted-foreground')}>
            {formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
          </p>
        </div>
        <div className='flex items-center justify-between'>
          <p
            className={cn(
              'max-w-[180px] truncate text-xs',
              isUnread ? 'font-medium text-white' : 'text-muted-foreground'
            )}
          >
            {conversation.lastMessage?.content || 'Không có tin nhắn'}
          </p>
          {isUnread && <div className='bg-primary ml-1 h-2 w-2 rounded-full'></div>}
        </div>
      </div>
      <div className='ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'>
        <ConversationActions
          conversationId={conversation._id}
          isArchived={isArchived}
          otherUserId={otherUserId as any}
        />
      </div>
    </div>
  )
}
