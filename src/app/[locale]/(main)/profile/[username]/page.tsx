'use client'

import { format } from 'date-fns'
import { Calendar, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { use, useState } from 'react'
import FriendHoverCard from '~/components/friend-hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { FRIEND_REQUEST_STATUS } from '~/constants/enums'
import { useStartConversationMutation } from '~/hooks/data/chat.hooks'
import {
  useCancelFriendRequestMutation,
  useFriendsByUsername,
  useFriendStatus,
  useRemoveFriendMutation,
  useSendFriendRequestMutation
} from '~/hooks/data/friends.hook'
import { useUserByUsername } from '~/hooks/data/user.hooks'
import ProfileSkeleton from '../components/profile-skeleton'
import NotFound from '../not-found'
import { ProfileEditDialog } from '~/components/profile-edit-dialog'

type Props = {
  params: Promise<{
    username: string
  }>
}

function Profile({ params }: Props) {
  const { username } = use(params)
  const { data: session } = useSession()
  const { data: profileFriends, isLoading: isLoadingProfileFriends } = useFriendsByUsername(username)
  const { data: profileData, isLoading, error, isError, refetch } = useUserByUsername(username)
  const isMyProfile = session?.user?.username === username
  const {
    data: friendStatus,
    refetch: refetchStatus,
    isLoading: isLoadingFriendStatus
  } = useFriendStatus(profileData?._id, {
    enabled: !!profileData && !isMyProfile
  })

  const sendFriendRequest = useSendFriendRequestMutation()
  const startConversation = useStartConversationMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleFriendAction = () => {
    // Nếu đang là bạn bè, hiển thị dialog xác nhận hủy kết bạn
    if (friendStatus?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
      setShowConfirmDialog(true)
      return
    }

    // Nếu đã gửi lời mời, thực hiện hủy lời mời
    if (friendStatus?.status === FRIEND_REQUEST_STATUS.PENDING) {
      if (cancelFriendRequest.isPending || !profileData?._id) return

      cancelFriendRequest.mutate(profileData._id, {
        onSuccess: () => {
          refetchStatus()
        }
      })
      return
    }

    // Trường hợp gửi lời mời kết bạn mới
    if (sendFriendRequest.isPending || !profileData?._id) return

    sendFriendRequest.mutate(profileData._id, {
      onSuccess: () => {
        refetchStatus()
      }
    })
  }

  // Xử lý khi click vào nút nhắn tin
  const handleMessageAction = () => {
    if (startConversation.isPending || !profileData?._id) return

    startConversation.mutate(profileData._id)
  }

  // Xử lý khi xác nhận hủy kết bạn
  const handleConfirmRemoveFriend = () => {
    if (removeFriend.isPending || !profileData?._id) return

    removeFriend.mutate(profileData._id, {
      onSuccess: () => {
        refetchStatus()
        setShowConfirmDialog(false)
      }
    })
  }

  // Hàm xử lý khi cập nhật thông tin thành công
  const handleProfileUpdated = () => {
    refetch() // Tải lại thông tin profile
  }

  // Hiển thị skeleton khi đang tải
  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (isError) {
    console.error('Error loading profile:', error)
    return <NotFound />
  }

  if (!username || !profileData) {
    return <NotFound />
  }

  return (
    <div className='mx-auto my-6 w-full max-w-5xl space-y-6 px-4'>
      {/* Cover + Avatar */}
      <Card className='pt-0'>
        <div
          className='bg-muted h-48 rounded-t-md'
          style={
            profileData?.coverPhoto
              ? {
                  backgroundImage: `url(${profileData.coverPhoto})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : {}
          }
        />
        <CardContent className='-mt-12 flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-end'>
          <Avatar className='border-b-accent h-28 w-28 border-4 shadow-md'>
            <AvatarImage src={profileData?.avatar} alt={profileData?.name || 'User'} />
            <AvatarFallback>{profileData?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className='flex-1'>
            <h1 className='text-xl font-bold'>{profileData?.name || 'User'}</h1>
            <p className='text-muted-foreground text-sm'>@{profileData?.username || ''}</p>
            <p className='text-muted-foreground text-sm'>{profileFriends?.length || 0} người bạn</p>
          </div>
          <div className='flex gap-2'>
            {isMyProfile ? (
              <>
                <Button size='sm'>+ Thêm vào tin</Button>
                <ProfileEditDialog 
                  userData={profileData}
                  onProfileUpdated={handleProfileUpdated}
                />
              </>
            ) : (
              <>
                <Button
                  size='sm'
                  onClick={handleFriendAction}
                  disabled={
                    sendFriendRequest.isPending ||
                    cancelFriendRequest.isPending ||
                    removeFriend.isPending ||
                    isLoadingFriendStatus
                  }
                >
                  {isLoadingFriendStatus ? (
                    <>
                      <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></span>
                      Đang tải...
                    </>
                  ) : sendFriendRequest.isPending || cancelFriendRequest.isPending || removeFriend.isPending ? (
                    <>
                      <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></span>
                      Đang xử lý...
                    </>
                  ) : friendStatus?.status === FRIEND_REQUEST_STATUS.PENDING ? (
                    'Hủy lời mời'
                  ) : friendStatus?.status === FRIEND_REQUEST_STATUS.ACCEPTED ? (
                    'Bạn bè'
                  ) : (
                    '+ Kết bạn'
                  )}
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleMessageAction}
                  disabled={startConversation.isPending}
                >
                  {startConversation.isPending ? (
                    <>
                      <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Nhắn tin'
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main layout 2 columns */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {/* Left column */}
        <div className='space-y-4 md:col-span-1'>
          {/* Giới thiệu */}
          <Card className='py-0'>
            <CardContent className='space-y-2 p-4'>
              <h3 className='font-semibold'>Giới thiệu</h3>
              {profileData?.bio && <p>{profileData.bio}</p>}
              {profileData?.dateOfBirth && (
                <div className='flex items-center gap-2'>
                  <span>🎂</span>
                  <span>Sinh ngày {format(new Date(profileData.dateOfBirth), 'dd/MM/yyyy')}</span>
                </div>
              )}
              <div className='flex items-center gap-2'>
                <Users className='h-4 w-4' />
                <span>{profileFriends?.length || 0} người bạn</span>
              </div>
              {profileData?.createdAt && (
                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4' />
                  <span>Tham gia từ {format(new Date(profileData.createdAt), 'MM/yyyy')}</span>
                </div>
              )}
              {isMyProfile && (
                <Button size='sm' className='mt-2 w-full'>
                  Chỉnh sửa chi tiết
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Ảnh */}
          <Card className='py-0'>
            <CardContent className='space-y-2 p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold'>Ảnh</h3>
                <Button variant='link' size='sm'>
                  Xem tất cả ảnh
                </Button>
              </div>
              <div className='grid grid-cols-3 gap-1'>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className='bg-muted aspect-square rounded' />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bạn bè */}
          <Card className='py-0'>
            <CardContent className='space-y-2 p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold'>Bạn bè</h3>
                <Button variant='link' size='sm'>
                  Xem tất cả
                </Button>
              </div>
              <p className='text-muted-foreground text-sm'>{profileFriends?.length || 0} người bạn</p>
              <div className='space-y-2'>
                {isLoadingProfileFriends ? (
                  // Hiển thị skeleton khi đang tải
                  [...Array(6)].map((_, i) => (
                    <div key={i} className='flex items-center gap-3 p-2'>
                      <Skeleton className='h-12 w-12 rounded-full' />
                      <div className='space-y-1'>
                        <Skeleton className='h-4 w-24' />
                        <Skeleton className='h-3 w-16' />
                      </div>
                    </div>
                  ))
                ) : profileFriends && profileFriends.length > 0 ? (
                  // Hiển thị danh sách bạn bè với HoverCard
                  profileFriends.slice(0, 9).map((friend) => (
                    <FriendHoverCard key={friend._id} friend={friend}>
                      <div className='hover:bg-muted flex items-center gap-3 rounded-md p-2 transition-colors'>
                        <Avatar className='h-12 w-12 flex-shrink-0'>
                          <AvatarImage src={friend.avatar} alt={friend.name} />
                          <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className='flex-grow overflow-hidden'>
                          <p className='leading-none font-medium'>{friend.name}</p>
                        </div>
                      </div>
                    </FriendHoverCard>
                  ))
                ) : (
                  // Hiển thị khi không có bạn bè
                  <div className='text-muted-foreground py-2 text-center'>Chưa có bạn bè</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className='space-y-4 md:col-span-2'>
          {/* Form status - chỉ hiển thị nếu là profile của mình */}
          {isMyProfile && (
            <Card className='py-0'>
              <CardContent className='space-y-2 p-4'>
                <Input placeholder='Bạn đang nghĩ gì?' className='w-full resize-none rounded-md border p-3 text-sm' />
                <div className='flex flex-wrap gap-2'>
                  <Button size='sm' variant='ghost'>
                    📹 Video trực tiếp
                  </Button>
                  <Button size='sm' variant='ghost'>
                    🖼 Ảnh/video
                  </Button>
                  <Button size='sm' variant='ghost'>
                    📅 Sự kiện
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bài viết mẫu */}
          <Card className='py-0'>
            <CardContent className='space-y-2 p-4'>
              {/* Header */}
              <div className='flex items-center gap-3'>
                <Avatar className='h-10 w-10'>
                  <AvatarImage src={profileData?.avatar} alt={profileData?.name || 'User'} />
                  <AvatarFallback>{profileData?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className='text-sm'>
                  <p className='font-medium'>{profileData?.name || 'User'}</p>
                  <p className='text-muted-foreground text-xs'>31 tháng 5, 2022</p>
                </div>
              </div>
              {/* Video */}
              <div className='bg-muted aspect-video rounded-md' />
              {/* Text content */}
              <p className='text-sm'>
                Dù bạn không hoàn hảo, nhưng rồi sẽ có người đến và yêu bạn bằng tất cả chân thành ❤️
              </p>
              {/* Reactions */}
              <div className='text-muted-foreground mt-2 flex justify-between border-t pt-2 text-xs'>
                <div>👍❤️ {profileData?.name || 'User'} và Rinoa Zoro</div>
                <div>10 bình luận</div>
              </div>
              {/* Actions */}
              <div className='mt-2 flex justify-between border-t pt-2 text-sm'>
                <Button variant='ghost' size='sm'>
                  👍 Thương thương
                </Button>
                <Button variant='ghost' size='sm'>
                  💬 Bình luận
                </Button>
                <Button variant='ghost' size='sm'>
                  ↗️ Chia sẻ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog xác nhận hủy kết bạn */}
      {showConfirmDialog && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận hủy kết bạn</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn hủy kết bạn với {profileData?.name}? Hành động này sẽ xóa tất cả các kết nối bạn
                bè giữa hai người.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowConfirmDialog(false)}>
                Hủy
              </Button>
              <Button variant='destructive' onClick={handleConfirmRemoveFriend} disabled={removeFriend.isPending}>
                {removeFriend.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog chỉnh sửa thông tin */}
      {isMyProfile && <ProfileEditDialog userData={profileData} onProfileUpdated={handleProfileUpdated} />}
    </div>
  )
}

export default Profile
