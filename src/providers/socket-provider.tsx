'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { createContext, ReactNode, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import nextEnv from '~/config/next-env'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useRouter } from '~/i18n/navigation'

// Biến toàn cục để theo dõi tương tác người dùng
let hasUserInteracted = false

// Đăng ký sự kiện để theo dõi tương tác người dùng
if (typeof window !== 'undefined') {
  const interactionEvents = ['click', 'keydown', 'touchstart', 'scroll']

  const markInteraction = () => {
    hasUserInteracted = true
    console.log('Người dùng đã tương tác với trang')

    // Sau khi đã đánh dấu, không cần lắng nghe sự kiện nữa
    interactionEvents.forEach((event) => {
      window.removeEventListener(event, markInteraction)
    })
  }

  interactionEvents.forEach((event) => {
    window.addEventListener(event, markInteraction)
  })
}

// Biến toàn cục để lưu trữ AudioContext và buffer
let audioContext: AudioContext | null = null
let notificationBuffer: AudioBuffer | null = null

// Hàm để tải âm thanh thông báo
const loadNotificationSound = async () => {
  try {
    // Tạo AudioContext nếu chưa có
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    // Tải file âm thanh
    const response = await fetch('/audio/notification.mp3')
    if (!response.ok) {
      throw new Error('Không thể tải file âm thanh')
    }

    const arrayBuffer = await response.arrayBuffer()

    // Giải mã âm thanh
    notificationBuffer = await audioContext.decodeAudioData(arrayBuffer)
    console.log('Đã tải âm thanh thông báo thành công')
  } catch (error) {
    console.error('Không thể tải âm thanh thông báo:', error)
  }
}

// Hàm để phát âm thanh thông báo
const playNotificationSound = () => {
  if (!audioContext || !notificationBuffer) {
    console.log('AudioContext hoặc buffer chưa được khởi tạo')
    return
  }

  try {
    // Đảm bảo AudioContext đang chạy
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    // Tạo nguồn âm thanh
    const source = audioContext.createBufferSource()
    source.buffer = notificationBuffer

    // Tạo bộ điều khiển âm lượng
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 1.0 // Âm lượng tối đa

    // Kết nối các node
    source.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Phát âm thanh
    source.start(0)
    console.log('Đang phát âm thanh thông báo')
  } catch (error) {
    console.error('Không thể phát âm thanh thông báo:', error)
  }
}

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
  const [message, setLastMessage] = useState<any | null>(null)
  const router = useRouter()

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

      // Phát ra thông báo nếu tin nhắn không phải từ người dùng hiện tại
      if (message.senderId !== session?.user?._id) {
        // Hiển thị toast thông báo
        toast(`Tin nhắn mới từ ${message.senderName || 'Ai đó'}`, {
          description: message.content || 'Bạn có tin nhắn mới',
          position: 'bottom-left',
          duration: 5000,
          action: {
            label: 'Xem',
            onClick: () => {
              if (message.chatId) {
                router.push(`/messages/${message.chatId}`)
              } else {
                router.push(`/messages`)
              }
            }
          }
        })

        // 2. Phát âm thanh đơn giản
        try {
          const audio = new Audio('/audio/notification.mp3')
          const playPromise = audio.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log('Âm thanh đã phát thành công'))
              .catch((err) => {
                // Nếu không thể phát tự động, hiển thị nút để người dùng phát
                toast('Nhấp để bật âm thanh thông báo', {
                  action: {
                    label: 'Phát',
                    onClick: () => {
                      const manualAudio = new Audio('/audio/notification.mp3')
                      manualAudio.play()
                    }
                  }
                })
              })
          }
        } catch (error) {
          console.error('Lỗi khi tạo đối tượng Audio:', error)
        }

        // 3. Thử hiển thị thông báo Web Notification
        if ('Notification' in window) {
          console.log('Trạng thái quyền thông báo:', Notification.permission)

          if (Notification.permission === 'granted') {
            try {
              const notification = new Notification('Tin nhắn mới', {
                body: `${message.senderName || 'Ai đó'}: ${message.content || 'Bạn có tin nhắn mới'}`,
                icon: '/favicon.ico'
              })

              notification.onclick = () => {
                window.focus()
                if (message.chatId) {
                  router.push(`/messages/${message.chatId}`)
                } else {
                  router.push(`/messages`)
                }
                notification.close()
              }
            } catch (error) {
              console.error('Lỗi khi hiển thị thông báo:', error)
            }
          } else if (Notification.permission !== 'denied') {
            // Yêu cầu quyền thông báo
            toast('Cho phép thông báo để nhận tin nhắn mới', {
              action: {
                label: 'Cho phép',
                onClick: () => {
                  Notification.requestPermission().then((permission) => {
                    console.log('Kết quả yêu cầu quyền thông báo:', permission)
                  })
                }
              }
            })
          }
        }
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

    // Lắng nghe sự kiện LAST_MESSAGE_UPDATED
    socket.on(SOCKET_EVENTS.LAST_MESSAGE_UPDATED, (data) => {
      const { conversationId, lastMessage } = data;
      
      // Cập nhật cache cho danh sách chat
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ['CHAT_LIST'] })
        .forEach((query) => {
          queryClient.setQueryData(query.queryKey, (oldData: any) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                conversations: page.conversations.map((conv: any) => {
                  if (conv._id === conversationId) {
                    return {
                      ...conv,
                      lastMessage: lastMessage,
                      updatedAt: lastMessage.createdAt
                    };
                  }
                  return conv;
                })
              }))
            };
          });
        });

      // Cập nhật tương tự cho danh sách chat đã lưu trữ
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ['ARCHIVED_CHAT_LIST'] })
        .forEach((query) => {
          // Tương tự như trên
          queryClient.setQueryData(query.queryKey, (oldData: any) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                conversations: page.conversations.map((conv: any) => {
                  if (conv._id === conversationId) {
                    return {
                      ...conv,
                      lastMessage: lastMessage,
                      updatedAt: lastMessage.createdAt
                    };
                  }
                  return conv;
                })
              }))
            };
          });
        });
    });

    return () => {
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE)
      socket.off(SOCKET_EVENTS.USER_ONLINE)
      socket.off(SOCKET_EVENTS.USER_OFFLINE)
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED)
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED)
      socket.off(SOCKET_EVENTS.CONVERSATION_DELETED)
      socket.off(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED)
      socket.off(SOCKET_EVENTS.LAST_MESSAGE_UPDATED)
    }
  }, [socket, queryClient, session])

  // Tải âm thanh khi component được mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadNotificationSound()
    }

    return () => {
      // Đóng AudioContext khi component unmount
      if (audioContext) {
        audioContext.close()
        audioContext = null
        notificationBuffer = null
      }
    }
  }, [])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}

export default SocketProvider
