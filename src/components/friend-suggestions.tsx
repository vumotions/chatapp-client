import { useEffect, useState } from 'react'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick-theme.css'
import 'slick-carousel/slick/slick.css'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { useStartConversationMutation } from '~/hooks/data/chat.hooks'
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useFriendSuggestionsQuery,
  useSendFriendRequestMutation
} from '~/hooks/data/friends.hook'
import { useQueryClient } from '@tanstack/react-query'

// Skeleton component cho item gợi ý kết bạn
function FriendSuggestionItemSkeleton() {
  return (
    <div className='h-full px-2'>
      <div className='bg-card flex h-full flex-col items-center gap-2 rounded-lg border p-4 shadow-sm'>
        <Skeleton className='h-16 w-16 rounded-full' />
        <div className='w-full text-center'>
          <Skeleton className='mx-auto mb-1 h-5 w-24' />
          <Skeleton className='mx-auto h-4 w-16' />
        </div>
        <div className='flex-grow' />
        <div className='mt-2 flex w-full flex-col gap-2'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    </div>
  )
}

export default function FriendSuggestions() {
  const { data: suggestions, isLoading, refetch } = useFriendSuggestionsQuery()
  const sendFriendRequest = useSendFriendRequestMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const acceptFriendRequest = useAcceptFriendRequestMutation()
  const startConversation = useStartConversationMutation()
  const queryClient = useQueryClient()

  const [selectedAdd, setSelectedAdd] = useState<string | null>(null)
  const [selectedCancel, setSelectedCancel] = useState<string | null>(null)
  const [selectedAccept, setSelectedAccept] = useState<string | null>(null)
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [justSentIds, setJustSentIds] = useState<string[]>([])

  const handleAddFriend = async (userId: string) => {
    setSelectedAdd(userId)
    try {
      await sendFriendRequest.mutateAsync(userId)

      // Cập nhật cache trực tiếp thay vì sử dụng state
      queryClient.setQueryData(['FRIEND_SUGGESTIONS'], (oldData: any) => {
        if (!oldData) return oldData

        const newData = { ...oldData }
        newData.data.data = newData.data.data.map((user: any) => {
          if (user._id === userId) {
            return { ...user, status: 'PENDING' }
          }
          return user
        })

        return newData
      })

      // Thêm vào danh sách vừa gửi (chỉ trong memory, không lưu localStorage)
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

      // Cập nhật cache trực tiếp thay vì sử dụng state
      queryClient.setQueryData(['FRIEND_SUGGESTIONS'], (oldData: any) => {
        if (!oldData) return oldData

        const newData = { ...oldData }
        newData.data.data = newData.data.data.map((user: any) => {
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

  // Cấu hình cho slider
  const sliderSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1
        }
      }
    ],
    adaptiveHeight: false,
    className: 'equal-height-slides'
  }

  return (
    <Card>
      <CardContent className='p-4'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>Gợi ý kết bạn</h3>
        </div>
        <div className='mx-auto max-w-[600px]'>
          {/* Thêm CSS để đảm bảo tất cả slide có chiều cao bằng nhau */}
          <style jsx global>{`
            .equal-height-slides .slick-track {
              display: flex !important;
            }
            .equal-height-slides .slick-slide {
              height: inherit !important;
              display: flex !important;
            }
            .equal-height-slides .slick-slide > div {
              width: 100%;
              height: 100%;
              display: flex;
            }
          `}</style>
          <Slider {...sliderSettings}>
            {suggestions?.map((user) => {
              // Kiểm tra xem người dùng đã gửi lời mời chưa
              const isPending =
                pendingIds.includes(user._id) || user.status === 'PENDING' || justSentIds.includes(user._id)
              const isReceived = user.status === 'RECEIVED'

              return (
                <div key={user._id} className='h-full px-2'>
                  <div className='bg-card flex h-full flex-col items-center gap-2 rounded-lg border p-4 shadow-sm'>
                    <Avatar className='h-16 w-16'>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className='text-center'>
                      <h4 className='font-medium'>{user.name}</h4>
                      <p className='text-muted-foreground text-sm'>{user.mutualFriends} bạn chung</p>
                    </div>

                    {/* Sử dụng flex-grow để đẩy các nút xuống dưới */}
                    <div className='flex flex-grow items-end justify-center'>
                      {isPending && <div className='truncate text-xs text-amber-500'>Đã gửi lời mời</div>}
                      {isReceived && <div className='truncate text-xs text-blue-500'>Đã gửi lời mời cho bạn</div>}
                    </div>

                    <div className='mt-2 flex w-full flex-col gap-2'>
                      {isPending ? (
                        <Button
                          size='sm'
                          variant='destructive'
                          className='w-full'
                          onClick={() => handleCancelRequest(user._id)}
                          disabled={selectedCancel === user._id || cancelFriendRequest.isPending}
                        >
                          {selectedCancel === user._id && cancelFriendRequest.isPending ? 'Đang hủy...' : 'Hủy lời mời'}
                        </Button>
                      ) : isReceived ? (
                        <Button
                          size='sm'
                          variant='default'
                          className='w-full'
                          onClick={() => handleAcceptRequest(user._id)}
                          disabled={selectedAccept === user._id || acceptFriendRequest.isPending}
                        >
                          {selectedAccept === user._id && acceptFriendRequest.isPending ? 'Đang xử lý...' : 'Chấp nhận'}
                        </Button>
                      ) : (
                        <Button
                          size='sm'
                          className='w-full'
                          onClick={() => handleAddFriend(user._id)}
                          disabled={selectedAdd === user._id || sendFriendRequest.isPending}
                        >
                          {selectedAdd === user._id && sendFriendRequest.isPending ? 'Đang gửi...' : 'Kết bạn'}
                        </Button>
                      )}
                      <Button
                        size='sm'
                        variant='outline'
                        className='w-full'
                        onClick={() => handleStartConversation(user._id)}
                        disabled={selectedMsg === user._id || startConversation.isPending}
                      >
                        {selectedMsg === user._id && startConversation.isPending ? 'Đang tạo...' : 'Nhắn tin'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Slider>
        </div>
      </CardContent>
    </Card>
  )
}
