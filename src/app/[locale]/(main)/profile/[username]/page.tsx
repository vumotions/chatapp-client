'use client'

import { useSession } from 'next-auth/react'
import { use } from 'react'
import FriendHoverCard from '~/components/friend-hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { useFriendsByUsername, useFriendsQuery } from '~/hooks/data/friends.hook'
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

  // Sử dụng hook mới để lấy bạn bè của người dùng đang xem
  const { data: profileFriends, isLoading: isLoadingProfileFriends } = useFriendsByUsername(username)

  // Vẫn giữ hook cũ để kiểm tra trạng thái bạn bè
  const { data: myFriends } = useFriendsQuery()

  // Sử dụng hook để lấy thông tin profile theo username
  const { data: profileData, isLoading, error, isError } = useUserByUsername(username)

  // Xác định xem đây có phải là profile của mình không
  const isMyProfile = session?.user?.username === username

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
    <div className='mx-auto my-6 max-w-7xl space-y-6 px-4'>
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
          <Avatar className='border-background h-28 w-28 border-4 shadow-md'>
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
                <Button size='sm' variant='outline'>
                  Chỉnh sửa trang cá nhân
                </Button>
              </>
            ) : (
              <>
                <Button size='sm'>+ Kết bạn</Button>
                <Button size='sm' variant='outline'>
                  Nhắn tin
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
              {isMyProfile ? (
                <>
                  <Button variant='outline' className='w-full'>
                    Thêm tiểu sử
                  </Button>
                  <p>📍 Sống tại {profileData?.location || 'Hà Nội'}</p>
                  <p>💙 {profileData?.relationship || 'Độc thân'}</p>
                  <p>📡 Có {profileData?.followers?.length || 14} người theo dõi</p>
                  <Button size='sm' className='w-full'>
                    Chỉnh sửa chi tiết
                  </Button>
                </>
              ) : (
                <>
                  <h3 className='font-semibold'>Giới thiệu</h3>
                  {profileData?.bio && <p>{profileData.bio}</p>}
                  <p>📍 Sống tại {profileData?.location || 'Hà Nội'}</p>
                  <p>💙 {profileData?.relationship || 'Độc thân'}</p>
                  <p>📡 Có {profileData?.followers?.length || 14} người theo dõi</p>
                </>
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
              <div className='grid grid-cols-3 gap-2'>
                {isLoadingProfileFriends ? (
                  // Hiển thị skeleton khi đang tải
                  [...Array(6)].map((_, i) => (
                    <div key={i} className='space-y-1'>
                      <Skeleton className='aspect-square rounded' />
                      <Skeleton className='mx-auto h-3 w-16' />
                    </div>
                  ))
                ) : profileFriends && profileFriends.length > 0 ? (
                  // Hiển thị danh sách bạn bè với HoverCard
                  profileFriends.slice(0, 9).map((friend) => (
                    <FriendHoverCard key={friend._id} friend={friend}>
                      <div className='flex cursor-pointer flex-col items-center justify-center space-y-1'>
                        <Avatar className='aspect-square h-12 w-12 overflow-hidden'>
                          <AvatarImage src={friend.avatar} alt={friend.name} />
                          <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <p className='truncate text-center text-xs'>{friend.name}</p>
                      </div>
                    </FriendHoverCard>
                  ))
                ) : (
                  // Hiển thị khi không có bạn bè
                  <div className='text-muted-foreground col-span-3 py-2 text-center'>Chưa có bạn bè</div>
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
    </div>
  )
}

export default Profile
