'use client'

import NotFound from '../not-found'

import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { useMyProfileQuery } from '~/hooks/data/auth.hooks'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import { Skeleton } from '~/components/ui/skeleton'

type Props = {
  params: {
    username: string
  }
}

function Profile({ params }: Props) {
  const { username } = params
  const { data, isLoading, error } = useMyProfileQuery()
  const { data: friends, isLoading: isLoadingFriends } = useFriendsQuery()

  if (isLoading) {
    return (
      <div className='mx-auto my-6 max-w-7xl space-y-6 px-4'>
        <Card className='pt-0'>
          <div className='bg-muted h-48 rounded-t-md' />
          <CardContent className='-mt-12 flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-end'>
            <Skeleton className='h-28 w-28 rounded-full' />
            <div className='flex-1'>
              <Skeleton className='mb-2 h-6 w-32' />
              <Skeleton className='h-4 w-24' />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    console.error('Error loading profile:', error)
    return <div>Error loading profile. Please try again later.</div>
  }

  if (!username) {
    return <NotFound />
  }
  return (
    <div className='mx-auto my-6 max-w-7xl space-y-6 px-4'>
      {/* Cover + Avatar */}
      <Card className='pt-0'>
        <div
          className='bg-muted h-48 rounded-t-md'
          style={
            data?.coverPhoto
              ? {
                  backgroundImage: `url(${data.coverPhoto})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : {}
          }
        />
        <CardContent className='-mt-12 flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-end'>
          <Avatar className='border-background h-28 w-28 border-4 shadow-md'>
            <AvatarImage src={data?.avatar} alt={data?.name || 'User'} />
            <AvatarFallback>{data?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className='flex-1'>
            <h1 className='text-xl font-bold'>{data?.name || 'User'}</h1>
            <p className='text-muted-foreground text-sm'>@{data?.username || username}</p>
            <p className='text-muted-foreground text-sm'>{friends?.length || 0} người bạn</p>
          </div>
          <div className='flex gap-2'>
            <Button size='sm'>+ Thêm vào tin</Button>
            <Button size='sm' variant='outline'>
              Chỉnh sửa trang cá nhân
            </Button>
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
              <Button variant='outline' className='w-full'>
                Thêm tiểu sử
              </Button>
              <p>📍 Sống tại Hà Nội</p>
              <p>💙 Độc thân</p>
              <p>📡 Có 14 người theo dõi</p>
              <Button size='sm' className='w-full'>
                Chỉnh sửa chi tiết
              </Button>
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
              <p className='text-muted-foreground text-sm'>{friends?.length || 0} người bạn</p>
              <div className='grid grid-cols-3 gap-2'>
                {isLoadingFriends ? (
                  // Hiển thị skeleton khi đang tải
                  [...Array(6)].map((_, i) => (
                    <div key={i} className='space-y-1'>
                      <Skeleton className='aspect-square rounded' />
                      <Skeleton className='mx-auto h-3 w-16' />
                    </div>
                  ))
                ) : friends && friends.length > 0 ? (
                  // Hiển thị danh sách bạn bè
                  friends.slice(0, 9).map((friend) => (
                    <div key={friend._id} className='space-y-1'>
                      <Avatar className='aspect-square w-full'>
                        <AvatarImage src={friend.avatar} alt={friend.name} />
                        <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className='truncate text-center text-xs'>{friend.name}</p>
                    </div>
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
          {/* Form status */}
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

          <Card className='py-0'>
            <CardContent className='space-y-2 p-4'>
              {/* Header */}
              <div className='flex items-center gap-3'>
                <Avatar className='h-10 w-10' />
                <div className='text-sm'>
                  <p className='font-medium'>{data?.name || 'User'}</p>
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
                <div>👍❤️ {data?.name || 'User'} và Rinoa Zoro</div>
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
