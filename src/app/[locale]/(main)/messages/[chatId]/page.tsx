'use client'
import { v4 as uuidv4 } from 'uuid'
import { addDays, addHours, format, formatDistanceToNow, nextSaturday } from 'date-fns'
import { Archive, ArchiveX, Clock, Forward, MoreVertical, Reply, ReplyAll, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
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
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '~/components/ui/chat/chat-bubble'
import MessageLoading from '~/components/ui/chat/message-loading'
import { CHAT_TYPE, MEDIA_TYPE, MESSAGE_STATUS, MESSAGE_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { uniqueId } from 'lodash'

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
  // 1. Tất cả các state và ref - Xóa localMessages
  const { chatId } = use(params)
  const [message, setMessage] = useState('')
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sentTempIds, setSentTempIds] = useState<Set<string>>(new Set())
  // Xóa localMessages
  // const [localMessages, setLocalMessages] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const { socket } = useSocket()
  const { data, isLoading, isError, fetchNextPage, hasNextPage } = useMessages(chatId)
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

  // 3. Tất cả các useEffect
  // Reset localMessages khi chatId thay đổi
  // useEffect(() => {
  //   setLocalMessages([])
  // }, [chatId])

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
    if (messagesEndRef.current && (isFirstLoad || data)) {
      // Đặt timeout dài hơn để đảm bảo tất cả tin nhắn đã được render
      setTimeout(() => {
        // Đảm bảo cuộn xuống cuối cùng mà không bị ảnh hưởng bởi fetch message cũ
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
          // Đặt scrollTop để đảm bảo cuộn xuống cuối cùng
          const scrollableDiv = document.getElementById('messageScrollableDiv')
          if (scrollableDiv) {
            scrollableDiv.scrollTop = scrollableDiv.scrollHeight
          }
        }
      }, 500) // Tăng timeout lên 500ms

      if (isFirstLoad) setIsFirstLoad(false)
    }
  }, [data, isFirstLoad])

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

      // Cuộn xuống sau khi nhận tin nhắn mới
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 300)
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
    console.log('Current state:', { isLoadingMore, hasNextPage })

    if (isLoadingMore || !hasNextPage) {
      console.log('Skipping fetch due to:', { isLoadingMore, hasNextPage })
      return
    }

    console.log('Fetching next page...')
    setIsLoadingMore(true)

    fetchNextPage()
      .then(() => {
        console.log('Fetch completed successfully')
      })
      .catch((error) => {
        console.error('Error fetching next page:', error)
      })
      .finally(() => {
        setIsLoadingMore(false)
        console.log('Loading state reset')
      })
  }, [fetchNextPage, hasNextPage, isLoadingMore])

  // Thêm xử lý sự kiện wheel để bắt sự kiện lăn chuột
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const scrollableDiv = document.getElementById('messageScrollableDiv')
      if (!scrollableDiv) return

      // Nếu đang ở gần đầu và lăn lên trên (deltaY < 0)
      if (scrollableDiv.scrollTop < 100 && e.deltaY < 0 && hasNextPage && !isLoadingMore) {
        handleFetchNextPage()
      }
    },
    [handleFetchNextPage, hasNextPage, isLoadingMore]
  )

  // Thêm useEffect để đăng ký sự kiện wheel
  useEffect(() => {
    const scrollableDiv = document.getElementById('messageScrollableDiv')
    if (!scrollableDiv) return

    scrollableDiv.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      scrollableDiv.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

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

    // Cuộn xuống
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 300)
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

  if (isError) {
    return <div className='flex h-full items-center justify-center p-4'>Failed to fetch messages</div>
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
                <ArchiveX className='h-4 w-4' />
                <span className='sr-only'>Move to junk</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to junk</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <Trash2 className='h-4 w-4' />
                <span className='sr-only'>Move to trash</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>
          <Separator orientation='vertical' className='mx-1 h-6' />
          <Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' disabled={!chatId}>
                    <Clock className='h-4 w-4' />
                    <span className='sr-only'>Snooze</span>
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <PopoverContent className='flex w-[535px] p-0'>
                <div className='flex flex-col gap-2 border-r px-2 py-4'>
                  <div className='px-4 text-sm font-medium'>Snooze until</div>
                  <div className='grid min-w-[250px] gap-1'>
                    <Button variant='ghost' className='justify-start font-normal'>
                      Later today{' '}
                      <span className='text-muted-foreground ml-auto'>
                        {format(addHours(new Date(), 4), 'E, h:m b')}
                      </span>
                    </Button>
                    <Button variant='ghost' className='justify-start font-normal'>
                      Tomorrow
                      <span className='text-muted-foreground ml-auto'>
                        {format(addDays(new Date(), 1), 'E, h:m b')}
                      </span>
                    </Button>
                    <Button variant='ghost' className='justify-start font-normal'>
                      This weekend
                      <span className='text-muted-foreground ml-auto'>
                        {format(nextSaturday(new Date()), 'E, h:m b')}
                      </span>
                    </Button>
                    <Button variant='ghost' className='justify-start font-normal'>
                      Next week
                      <span className='text-muted-foreground ml-auto'>
                        {format(addDays(new Date(), 7), 'E, h:m b')}
                      </span>
                    </Button>
                  </div>
                </div>
                <div className='p-2'>
                  <Calendar />
                </div>
              </PopoverContent>
            </Popover>
            <TooltipContent>Snooze</TooltipContent>
          </Tooltip>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <Reply className='h-4 w-4' />
                <span className='sr-only'>Reply</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <ReplyAll className='h-4 w-4' />
                <span className='sr-only'>Reply all</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!chatId}>
                <Forward className='h-4 w-4' />
                <span className='sr-only'>Forward</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
        </div>
        <Separator orientation='vertical' className='mx-2 h-6' />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' disabled={!chatId}>
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
            <div className='flex items-start gap-4 text-sm'>
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
              <div className='grid gap-1'>
                <div className='font-semibold'>
                  {data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)?.name ||
                    'Cuộc trò chuyện'}
                </div>
                {data?.pages[0]?.conversation?.createdAt && (
                  <div className='text-muted-foreground ml-auto text-xs'>
                    {format(new Date(data.pages[0].conversation.createdAt), 'PPpp', { locale: vi })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Separator />
          <div
            className='h-[calc(100vh-250px)] flex-1 overflow-y-auto'
            id='messageScrollableDiv'
            style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}
            onScroll={(e) => {
              const { scrollTop } = e.currentTarget

              // Nếu cuộn gần đến đầu và có thêm dữ liệu, tải thêm
              if (scrollTop < 100 && hasNextPage && !isLoadingMore) {
                handleFetchNextPage()
              }
            }}
          >
            <div className='flex flex-col gap-4 p-4'>
              {isLoadingMore && (
                <div className='flex justify-center p-4'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                </div>
              )}

              {!hasNextPage && (
                <div className='text-muted-foreground p-2 text-center text-xs'>Không còn tin nhắn cũ nào nữa</div>
              )}

              {/* Danh sách tin nhắn */}
              {allMessages?.map((msg, index) => {
                // Kiểm tra chính xác hơn xem tin nhắn có phải do người dùng hiện tại gửi không
                const isSentByMe = isMessageFromCurrentUser(msg)

                // Kiểm tra xem đây có phải là tin nhắn cuối cùng trong một chuỗi tin nhắn từ cùng một người
                const isLastMessageInGroup =
                  index === allMessages.length - 1 || !isSameUser(msg, allMessages[index + 1])

                // Tạo key duy nhất bằng cách kết hợp ID tin nhắn và index
                const uniqueKey = `${msg._id}-${index}`

                // Xác định variant dựa trên người gửi
                const bubbleVariant = isSentByMe ? 'sent' : 'received'

                return (
                  <ChatBubble key={uniqueKey} variant={bubbleVariant}>
                    {!isSentByMe && (
                      <ChatBubbleAvatar
                        src={typeof msg.senderId === 'object' ? msg.senderId.avatar : undefined}
                        fallback={typeof msg.senderId === 'object' ? msg.senderId.name?.[0] || '' : '?'}
                      />
                    )}
                    <ChatBubbleMessage variant={bubbleVariant}>
                      <div>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</div>
                      {isLastMessageInGroup && (
                        <div
                          className={`text-muted-foreground mt-1 text-xs ${isSentByMe ? 'text-right' : 'text-left'}`}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      )}
                    </ChatBubbleMessage>
                  </ChatBubble>
                )
              })}

              {/* Hiển thị hiệu ứng typing nếu có người đang nhập - đặt ở cuối danh sách tin nhắn */}
              {isAnyoneTyping && (
                <ChatBubble variant='received'>
                  <ChatBubbleAvatar
                    src={
                      data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)?.avatar
                    }
                    fallback={
                      data?.pages[0]?.conversation?.participants?.find((p: any) => p._id !== session?.user?._id)
                        ?.name?.[0] || '?'
                    }
                  />
                  <ChatBubbleMessage variant='received' isLoading={true}>
                    <MessageLoading />
                  </ChatBubbleMessage>
                </ChatBubble>
              )}

              <div ref={messagesEndRef} />
            </div>
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
