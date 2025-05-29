'use client'

import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { use, useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import ProfileForm from '~/app/[locale]/(main)/settings/(profile)/form-profile'
import FriendHoverCard from '~/components/friend-hover-card'
import PostSkeleton from '~/components/post-skeleton'
import { Post } from '~/components/posts/post'
import PostEditorV2 from '~/components/posts/post-editor-v2'
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
import { useUserPosts } from '~/hooks/data/post.hooks'
import { useUserByUsername } from '~/hooks/data/user.hooks'
import ProfileSkeleton from '../components/profile-skeleton'
import NotFound from '../not-found'

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

  // Đảm bảo hook này được gọi ở mức cao nhất, không phụ thuộc vào điều kiện
  const {
    data: userPostsData,
    isLoading: isLoadingPosts,
    fetchNextPage,
    hasNextPage
  } = useUserPosts(profileData?._id || '', {
    enabled: !!profileData?._id
  })

  // Tổng hợp bài viết từ tất cả các trang - đặt useMemo ở mức cao nhất
  const userPosts = useMemo(() => {
    return userPostsData?.pages.flatMap((page) => page.posts) || []
  }, [userPostsData])

  const {
    data: friendStatus,
    refetch: refetchStatus,
    isLoading: isLoadingFriendStatus
  } = useFriendStatus(profileData?._id, {
    enabled: !!profileData && !isMyProfile
  })
  const queryClient = useQueryClient()
  const sendFriendRequest = useSendFriendRequestMutation()
  const startConversation = useStartConversationMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showProfileFormDialog, setShowProfileFormDialog] = useState(false)

  const refreshPosts = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['POSTS'] })
    } catch (error) {
      console.error('Error refreshing posts:', error)
    }
  }
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
    setShowProfileFormDialog(false) // Đóng dialog
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
                <Button size='sm' variant='outline' onClick={() => setShowProfileFormDialog(true)}>
                  Chỉnh sửa trang cá nhân
                </Button>
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
                  profileFriends.slice(0, 9).map((friend: any) => (
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
                  <div className='text-muted-foreground py-2 text-center'>Chưa có bạn bè</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className='space-y-4 md:col-span-2'>
          {/* Form status - chỉ hiển thị nếu là profile của mình */}
          {isMyProfile && <PostEditorV2 getPosts={refreshPosts} />}

          {/* Bài viết của người dùng */}
          <div className='space-y-4'>
            <h3 className='px-1 font-semibold'>Bài viết</h3>

            {/* Sử dụng InfiniteScroll để tải thêm bài viết khi cuộn */}
            <InfiniteScroll
              dataLength={userPosts?.length || 0}
              next={fetchNextPage}
              hasMore={!!hasNextPage}
              loader={
                <div className='space-y-4'>
                  <PostSkeleton />
                  <PostSkeleton />
                </div>
              }
              endMessage={
                <div className='text-muted-foreground p-2 text-center text-xs'>Không còn bài viết nào nữa</div>
              }
            >
              {isLoadingPosts ? (
                <div className='space-y-4'>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </div>
              ) : userPosts?.length === 0 ? (
                <Card className='py-4'>
                  <CardContent className='text-muted-foreground text-center'>
                    {isMyProfile
                      ? 'Bạn chưa có bài viết nào'
                      : `${profileData?.name || 'Người dùng'} chưa có bài viết nào`}
                  </CardContent>
                </Card>
              ) : (
                userPosts?.filter((post) => post && post._id).map((post) => <Post key={post._id} post={post} />)
              )}
            </InfiniteScroll>
          </div>
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
      {isMyProfile && (
        <Dialog open={showProfileFormDialog} onOpenChange={setShowProfileFormDialog}>
          <DialogContent className='flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]'>
            <DialogHeader className='flex-shrink-0'>
              <DialogTitle>Chỉnh sửa trang cá nhân</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin cá nhân của bạn. Thông tin này sẽ được hiển thị công khai.
              </DialogDescription>
            </DialogHeader>
            <div className='-mr-2 flex-grow overflow-y-auto py-4 pr-3'>
              <ProfileForm onProfileUpdated={handleProfileUpdated} redirectOnUsernameChange={true} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default Profile
