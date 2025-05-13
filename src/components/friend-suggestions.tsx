import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { useStartConversationMutation } from '~/hooks/data/chat.hooks'
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useFriendSuggestionsQuery,
  useSendFriendRequestMutation
} from '~/hooks/data/friends.hook'
import FriendSuggestionItemSkeleton from './friend-suggestion-item-skeleton'

// Skeleton component cho item gợi ý kết bạn

export default function FriendSuggestions() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(6) // Mặc định 6 items mỗi trang

  // Sử dụng hook với phân trang
  const { data, isLoading, refetch } = useFriendSuggestionsQuery(page, limit)
  const suggestions = data?.suggestions || []
  const pagination = data?.pagination

  const sendFriendRequest = useSendFriendRequestMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const acceptFriendRequest = useAcceptFriendRequestMutation()
  const startConversation = useStartConversationMutation()
  const queryClient = useQueryClient()
  const router = useRouter()

  const [selectedAdd, setSelectedAdd] = useState<string | null>(null)
  const [selectedCancel, setSelectedCancel] = useState<string | null>(null)
  const [selectedAccept, setSelectedAccept] = useState<string | null>(null)
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [justSentIds, setJustSentIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  // State cho responsive
  const containerRef = useRef<HTMLDivElement>(null)

  // Cập nhật số lượng items per page dựa trên kích thước màn hình
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 640) {
        setLimit(2) // 1 hàng x 2 cột cho mobile
      } else if (window.innerWidth < 1024) {
        setLimit(4) // 2 hàng x 2 cột cho tablet
      } else {
        setLimit(6) // 2 hàng x 3 cột cho desktop
      }
    }

    updateItemsPerPage()
    window.addEventListener('resize', updateItemsPerPage)
    return () => window.removeEventListener('resize', updateItemsPerPage)
  }, [])

  // Xử lý chuyển trang
  const nextPage = () => {
    if (pagination && page < pagination.totalPages) {
      setPage(page + 1)
    }
  }

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleAddFriend = async (userId: string) => {
    setSelectedAdd(userId)
    try {
      await sendFriendRequest.mutateAsync(userId)

      // Cập nhật cache trực tiếp
      queryClient.setQueryData(['FRIEND_SUGGESTIONS', page, limit], (oldData: any) => {
        if (!oldData) return oldData

        const newData = { ...oldData }
        newData.data.data.suggestions = newData.data.data.suggestions.map((user: any) => {
          if (user._id === userId) {
            return { ...user, status: 'PENDING' }
          }
          return user
        })

        return newData
      })

      // Thêm vào danh sách vừa gửi
      setJustSentIds((prev) => [...prev, userId])
      setPendingIds((prev) => [...prev, userId])

      toast.success('Đã gửi lời mời kết bạn')
    } catch (e) {
      // error handled by hook
    } finally {
      setSelectedAdd(null)
    }
  }

  const handleCancelRequest = async (userId: string) => {
    setSelectedCancel(userId)
    try {
      await cancelFriendRequest.mutateAsync(userId)

      // Cập nhật cache trực tiếp
      queryClient.setQueryData(['FRIEND_SUGGESTIONS', page, limit], (oldData: any) => {
        if (!oldData) return oldData

        const newData = { ...oldData }
        newData.data.data.suggestions = newData.data.data.suggestions.map((user: any) => {
          if (user._id === userId) {
            return { ...user, status: undefined }
          }
          return user
        })

        return newData
      })

      // Xóa khỏi danh sách pending và justSent
      setPendingIds((prev) => prev.filter((id) => id !== userId))
      setJustSentIds((prev) => prev.filter((id) => id !== userId))
    } catch (e) {
      console.error(e)
    } finally {
      setSelectedCancel(null)
    }
  }

  const handleAcceptRequest = async (userId: string) => {
    setSelectedAccept(userId)
    try {
      await acceptFriendRequest.mutateAsync(userId)
      toast.success('Đã chấp nhận lời mời kết bạn')
      refetch()
    } catch (e) {
      // error handled by hook
    } finally {
      setSelectedAccept(null)
    }
  }

  const handleStartConversation = async (userId: string) => {
    setSelectedMsg(userId)
    try {
      const response = await startConversation.mutateAsync(userId)
      // Chuyển hướng đến trang chat
      window.location.href = `/messages/${response.data.data._id}`
    } catch (e) {
      // error handled by hook
    } finally {
      setSelectedMsg(null)
    }
  }

  const handleViewProfile = (userId: string, username: string) => {
    if (selectedProfile === userId) return

    setSelectedProfile(userId)
    startTransition(() => {
      // Sử dụng username nếu có, nếu không thì dùng userId
      router.push(`/profile/${username || userId}`)
    })
  }

  return (
    <Card className='mb-6'>
      <CardContent className='p-4'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>Gợi ý kết bạn</h3>
          {pagination && pagination.totalPages > 1 && (
            <div className='flex gap-2'>
              <Button variant='outline' size='icon' onClick={prevPage} disabled={page === 1} className='h-8 w-8'>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                onClick={nextPage}
                disabled={page === pagination.totalPages}
                className='h-8 w-8'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>

        <div className='mx-auto max-w-[800px]' ref={containerRef}>
          {isLoading ? (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'>
              {[...Array(limit)].map((_, index) => (
                <FriendSuggestionItemSkeleton key={index} />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center'>Không có gợi ý kết bạn nào</div>
          ) : (
            <AnimatePresence mode='wait'>
              <motion.div
                key={page}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'
              >
                {suggestions.map((user) => {
                  // Kiểm tra xem người dùng đã gửi lời mời chưa
                  const isPending =
                    pendingIds.includes(user._id) || user.status === 'PENDING' || justSentIds.includes(user._id)
                  const isReceived = user.status === 'RECEIVED'
                  console.log({ user })
                  return (
                    <motion.div
                      key={user._id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className='h-full'
                    >
                      <div className='bg-card flex h-full flex-col items-center gap-2 rounded-lg border p-4 shadow-sm'>
                        <Avatar className='h-16 w-16'>
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className='text-center'>
                          <h4 className='font-medium'>{user.name}</h4>
                          <p className='text-muted-foreground text-sm'>{user.mutualFriends} bạn chung</p>
                        </div>

                        <div className='flex flex-grow items-end justify-center'>
                          {isPending && <div className='truncate text-xs text-amber-500'>Đã gửi lời mời</div>}
                          {isReceived && <div className='truncate text-xs text-blue-500'>Đã gửi lời mời cho bạn</div>}
                        </div>

                        <div className='mt-2 flex w-full flex-col gap-2'>
                          {isPending ? (
                            <>
                              <Button
                                size='sm'
                                variant='destructive'
                                className='w-full'
                                onClick={() => handleCancelRequest(user._id)}
                                disabled={selectedCancel === user._id || cancelFriendRequest.isPending}
                              >
                                {selectedCancel === user._id && cancelFriendRequest.isPending
                                  ? 'Đang hủy...'
                                  : 'Hủy lời mời'}
                              </Button>
                              <div className='flex w-full gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='flex-1'
                                  onClick={() => handleStartConversation(user._id)}
                                  disabled={selectedMsg === user._id || startConversation.isPending}
                                >
                                  {selectedMsg === user._id && startConversation.isPending ? 'Đang tạo...' : 'Nhắn tin'}
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='flex-1'
                                  onClick={() => handleViewProfile(user._id, user.username || '')}
                                  disabled={selectedProfile === user._id}
                                >
                                  {selectedProfile === user._id ? (
                                    <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                                  ) : (
                                    <User className='mr-1 h-4 w-4' />
                                  )}{' '}
                                  Hồ sơ
                                </Button>
                              </div>
                            </>
                          ) : isReceived ? (
                            <>
                              <Button
                                size='sm'
                                variant='default'
                                className='w-full'
                                onClick={() => handleAcceptRequest(user._id)}
                                disabled={selectedAccept === user._id || acceptFriendRequest.isPending}
                              >
                                {selectedAccept === user._id && acceptFriendRequest.isPending
                                  ? 'Đang xử lý...'
                                  : 'Chấp nhận'}
                              </Button>
                              <div className='flex w-full gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='flex-1'
                                  onClick={() => handleStartConversation(user._id)}
                                  disabled={selectedMsg === user._id || startConversation.isPending}
                                >
                                  {selectedMsg === user._id && startConversation.isPending ? 'Đang tạo...' : 'Nhắn tin'}
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='flex-1'
                                  onClick={() => handleViewProfile(user._id, user.username || '')}
                                  disabled={selectedProfile === user._id}
                                >
                                  {selectedProfile === user._id ? (
                                    <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                                  ) : (
                                    <User className='mr-1 h-4 w-4' />
                                  )}{' '}
                                  Hồ sơ
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className='flex w-full gap-2'>
                                <Button
                                  size='sm'
                                  className='flex-1'
                                  onClick={() => handleAddFriend(user._id)}
                                  disabled={selectedAdd === user._id || sendFriendRequest.isPending}
                                >
                                  {selectedAdd === user._id && sendFriendRequest.isPending ? 'Đang gửi...' : 'Kết bạn'}
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='flex-1'
                                  onClick={() => handleStartConversation(user._id)}
                                  disabled={selectedMsg === user._id || startConversation.isPending}
                                >
                                  {selectedMsg === user._id && startConversation.isPending ? 'Đang tạo...' : 'Nhắn tin'}
                                </Button>
                              </div>
                              <Button
                                size='sm'
                                variant='outline'
                                className='w-full'
                                onClick={() => handleViewProfile(user._id, user.username || '')}
                                disabled={selectedProfile === user._id}
                              >
                                {selectedProfile === user._id ? (
                                  <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                                ) : (
                                  <User className='mr-1 h-4 w-4' />
                                )}{' '}
                                Xem hồ sơ
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className='mt-4 flex justify-center gap-1'>
              {[...Array(pagination.totalPages)].map((_, index) => (
                <Button
                  key={index}
                  variant={page === index + 1 ? 'default' : 'outline'}
                  size='icon'
                  onClick={() => setPage(index + 1)}
                  className='h-8 w-8 rounded-full'
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
