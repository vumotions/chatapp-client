'use client'

import { useSession } from 'next-auth/react'
import { createContext, ReactNode, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import nextEnv from '~/config/next-env'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useQueryClient } from '@tanstack/react-query'

type Props = {
  children: ReactNode
}

type SocketContextType = {
  socket: Socket | null
}

export const SocketContext = createContext<SocketContextType>({
  socket: null
})

function SocketProvider({ children }: Props) {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const queryClient = useQueryClient()
  const [, setLastMessage] = useState<any | null>(null)

  useEffect(() => {
    const accessToken = session?.accessToken
    if (!accessToken) return

    const socketUrl = nextEnv.NEXT_PUBLIC_SERVER_URL
    console.log('Connecting to socket at URL:', socketUrl)

    const socketInstance = io(socketUrl, {
      auth: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    setSocket(socketInstance)

    // Xử lý các sự kiện socket
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error(`Lỗi kết nối: ${error?.message || 'Không thể kết nối đến server'}`)
    })

    // Thêm log cho các sự kiện khác
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts')
    })

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber)
    })

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return () => {
      console.log('Disconnecting socket')
      socketInstance.disconnect()
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (!socket) return

    // Lắng nghe sự kiện RECEIVE_MESSAGE để cập nhật tin nhắn cuối cùng
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (message) => {

      // Cập nhật state để các component con có thể phản ứng
      setLastMessage(message)

      // Cập nhật cache cho danh sách chat
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ['CHAT_LIST'] })
        .forEach((query) => {
          queryClient.setQueryData(query.queryKey, (oldData: any) => {
            if (!oldData) return oldData

            // Cập nhật cache logic...
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                conversations: page.conversations.map((conv: any) => {
                  if (conv._id === message.chatId) {
                    return {
                      ...conv,
                      lastMessage: message,
                      updatedAt: message.createdAt,
                      read: message.senderId === session?.user?._id // Đánh dấu đã đọc nếu là tin nhắn của chính mình
                    }
                  }
                  return conv
                })
              }))
            }
          })
        })

      // Cập nhật cache cho tin nhắn
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ['MESSAGES', message.chatId] })
        .forEach((query) => {
          queryClient.setQueryData(query.queryKey, (oldData: any) => {
            if (!oldData) return oldData

            // Tìm trang cuối cùng
            const lastPageIndex = oldData.pages.length - 1
            const lastPage = oldData.pages[lastPageIndex]

            // Kiểm tra xem tin nhắn đã tồn tại chưa
            const messageExists = lastPage.messages.some((msg: any) => msg._id === message._id)
            if (messageExists) return oldData

            // Thêm tin nhắn mới vào trang cuối cùng
            const updatedLastPage = {
              ...lastPage,
              messages: [...lastPage.messages, message]
            }

            // Cập nhật pages
            const updatedPages = [...oldData.pages]
            updatedPages[lastPageIndex] = updatedLastPage

            return {
              ...oldData,
              pages: updatedPages
            }
          })
        })

      // Phát ra âm thanh thông báo nếu tin nhắn không phải từ người dùng hiện tại
      if (message.senderId !== session?.user?._id) {
        const audio = new Audio('/sounds/notification.mp3')
        audio.play().catch((err) => console.error('Error playing notification sound:', err))
      }
    })

    // Lắng nghe sự kiện USER_ONLINE để cập nhật trạng thái online
    socket.on(SOCKET_EVENTS.USER_ONLINE, (userId) => {
      console.log('USER_ONLINE event received in provider:', userId)
      // Trạng thái online đã được xử lý trong chat-list.tsx
    })

    // Lắng nghe sự kiện USER_OFFLINE để cập nhật trạng thái offline
    socket.on(SOCKET_EVENTS.USER_OFFLINE, (userId, lastActive) => {
      console.log('USER_OFFLINE event received in provider:', userId, lastActive)
      // Trạng thái offline đã được xử lý trong chat-list.tsx
    })

    // Lắng nghe sự kiện MESSAGE_DELETED
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, (data) => {
      console.log('MESSAGE_DELETED event received in provider:', data)
    })

    // Lắng nghe sự kiện MESSAGE_UPDATED
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, () => {
      console.log('MESSAGE_UPDATED event received in provider')
    })

    // Lắng nghe sự kiện CONVERSATION_DELETED
    socket.on(SOCKET_EVENTS.CONVERSATION_DELETED, (data) => {
      console.log('CONVERSATION_DELETED event received in provider:', data)
    })

    // Lắng nghe sự kiện OWNERSHIP_TRANSFERRED
    socket.on(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED, (data) => {
      console.log('OWNERSHIP_TRANSFERRED event received in provider:', data)
      // Xử lý chi tiết sẽ được thực hiện trong GroupEventsListener
    })

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE)
      socket.off(SOCKET_EVENTS.USER_ONLINE)
      socket.off(SOCKET_EVENTS.USER_OFFLINE)
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED)
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED)
      socket.off(SOCKET_EVENTS.CONVERSATION_DELETED)
      socket.off(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED)
    }
  }, [socket, queryClient, session])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}

export default SocketProvider
