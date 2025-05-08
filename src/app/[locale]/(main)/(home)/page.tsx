'use client'

import { Heart, Images, Link as LinkIcon, MessageCircle, Send, SmilePlus } from 'lucide-react'
import PostSkeleton from '~/components/post-skeleton'
import Protected from '~/components/protected'
import SharePopover from '~/components/share-popover'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import nextEnv from '~/config/next-env'
import RightSidebarFriendList from './components/right-sidebar'

import { useSession } from 'next-auth/react'
import { cn } from '~/lib/utils'
import FriendSuggestions from '~/components/friend-suggestions'

function Home() {
  const { data: session } = useSession()
  console.log(session)
  return (
    <div className='mx-auto flex max-w-screen-2xl gap-4 py-4 lg:flex-row'>
      {/* Main Content */}
      <div className='flex flex-1 flex-col gap-4'>
        {/* Status input */}
        {/* <Card>
          <CardContent className='grid gap-2 px-4'>
            <Input placeholder='Lê ơi, bạn đang nghĩ gì thế?' className='rounded-full' />
            <div className='mt-2 ml-auto flex gap-2'>
              <Button variant='outline'>
                <Images /> Ảnh/video
              </Button>
              <Button variant='outline'>
                <SmilePlus />
              </Button>
              <Button variant='default'>Post</Button>
            </div>
          </CardContent>
        </Card> */}

        {/* Post */}
        {/* <PostSkeleton /> */}
        <FriendSuggestions />
        {/* <Card>
          <CardContent className='space-y-3 px-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src='https://i.pravatar.cc/100?img=45' />
                <AvatarFallback>K</AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>Killua Zoldyck</p>
                <p className='text-muted-foreground text-xs'>40 phút trước</p>
              </div>
            </div>
            <p className='text-lg font-semibold'>Cần tìm người pass phòng hộ. Giá 500k</p>

            <div className='text-muted-foreground flex justify-evenly border-t pt-2 text-sm'>
              <Button variant='ghost' size='icon'>
                <Heart />
              </Button>
              <Button variant='ghost' size='sm'>
                <MessageCircle />
              </Button>
              <Protected>
                <Button variant='ghost' size='sm'>
                  <Send />
                </Button>
              </Protected>
              <SharePopover shareUrl={`${nextEnv.NEXT_PUBLIC_URL_INTERNAL}/posts/${1}`}>
                <Button variant='ghost' size='sm'>
                  <LinkIcon className='h-4 w-4' />
                </Button>
              </SharePopover>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='space-y-3 px-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src='https://i.pravatar.cc/100?img=45' />
                <AvatarFallback>K</AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>Killua Zoldyck</p>
                <p className='text-muted-foreground text-xs'>40 phút trước</p>
              </div>
            </div>
            <p className='text-lg font-semibold'>Cần tìm người pass phòng hộ. Giá 500k</p>

            <div className='text-muted-foreground flex justify-evenly border-t pt-2 text-sm'>
              <Button variant='ghost' size='icon'>
                <Heart />
              </Button>
              <Button variant='ghost' size='sm'>
                <MessageCircle />
              </Button>
              <Button variant='ghost' size='sm'>
                <Send />
              </Button>
              <SharePopover shareUrl={`${nextEnv.NEXT_PUBLIC_URL_INTERNAL}/posts/${1}`}>
                <Button variant='ghost' size='sm'>
                  <LinkIcon className='h-4 w-4' />
                </Button>
              </SharePopover>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='space-y-3 px-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src='https://i.pravatar.cc/100?img=45' />
                <AvatarFallback>K</AvatarFallback>
              </Avatar>
              <div>
                <p className='font-semibold'>Killua Zoldyck</p>
                <p className='text-muted-foreground text-xs'>40 phút trước</p>
              </div>
            </div>
            <p className='text-lg font-semibold'>Cần tìm người pass phòng hộ. Giá 500k</p>

            <div className='text-muted-foreground flex justify-evenly border-t pt-2 text-sm'>
              <Button variant='ghost' size='icon'>
                <Heart />
              </Button>
              <Button variant='ghost' size='sm'>
                <MessageCircle />
              </Button>
              <Button variant='ghost' size='sm'>
                <Send />
              </Button>
              <SharePopover shareUrl={`${nextEnv.NEXT_PUBLIC_URL_INTERNAL}/posts/${1}`}>
                <Button variant='ghost' size='sm'>
                  <LinkIcon className='h-4 w-4' />
                </Button>
              </SharePopover>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Right Sidebar (friends list) */}
      <div
        className={cn('sticky top-[100px] h-fit w-fit lg:w-[250px]', {
          'hidden lg:flex': !session
        })}
      >
        <RightSidebarFriendList />
      </div>
    </div>
  )
}

export default Home
