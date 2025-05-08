'use client'

import { useSession } from 'next-auth/react'
import { Fragment } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { buttonVariants } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'

export default function RightSidebarFriendList() {
  const { data: session } = useSession()
  const friends = [
    { _id: '1', name: 'Nguyễn Văn A', avatar: '/avatars/a.png' },
    { _id: '2', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '3', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '4', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '5', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '6', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '7', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '8', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '9', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '10', name: 'Trần Thị B', avatar: '/avatars/b.png' },
    { _id: '11', name: 'Trần Thị B', avatar: '/avatars/b.png' }
  ]

  return (
    <Card>
      <CardContent className='px-2 lg:pr-2 lg:pl-4'>
        {session ? (
          <Fragment>
            <h4 className='mb-2 hidden font-semibold lg:block'>Người liên hệ</h4>
            <ScrollArea className='h-[70vh] lg:pr-5'>
              <div className='space-y-2'>
                {friends.map((friend) => (
                  <div key={friend._id} className='flex items-center gap-2'>
                    {/* Mobile: chỉ hiện avatar, hover mới hiện tooltip */}
                    <div className='block lg:hidden'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='relative flex cursor-pointer flex-col items-center'>
                            <Avatar className='size-12'>
                              <AvatarImage src={friend.avatar} alt={friend.name} />
                              <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                            </Avatar>
                            {/* Badge online */}
                            <span className='absolute right-1 bottom-1 block h-3 w-3 rounded-full border-2 border-white bg-green-500' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side='left' className='text-center'>
                          {friend.name}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {/* Desktop: hiện avatar kèm tên, không dùng tooltip */}
                    <div className='hidden items-center gap-2 lg:flex'>
                      <div className='relative'>
                        <Avatar className='size-10'>
                          <AvatarImage src={friend.avatar} alt={friend.name} />
                          <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {/* Badge online */}
                        <span className='absolute right-1 bottom-1 block h-3 w-3 rounded-full border-2 border-white bg-green-500' />
                      </div>
                      <span className='text-base'>{friend.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Fragment>
        ) : (
          <div className='flex h-full flex-col items-center justify-center p-4'>
            <div className='text-muted-foreground mb-4 text-center'>
              Đăng nhập để xem bạn bè, nhắn tin và kết nối với mọi người trên Teleface!
            </div>
            <Link
              className={cn(
                buttonVariants({
                  variant: 'default'
                })
              )}
              href='/auth/login'
            >
              Đăng nhập
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
