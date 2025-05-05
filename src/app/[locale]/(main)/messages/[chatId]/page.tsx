'use client'

import { addDays, addHours, format, nextSaturday } from 'date-fns'
import { Archive, ArchiveX, Clock, Forward, MoreVertical, Reply, ReplyAll, SendHorizontal, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Chat } from '~/types/common.types'

import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { use } from 'react'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'

type Props = {
  params: Promise<{ chatId: string }>
}

function ChatDetail({ params }: Props) {
  const { chatId } = use(params)
  const today = new Date()
  const { data: session } = useSession()
  console.log(session)
  const chats: Chat[] = [
    {
      _id: '1',
      userId: 'user1',
      type: 'PRIVATE',
      name: 'Alice',
      avatar:
        'https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      lastMessage: 'Hey, how are you?',
      participants: ['user1', 'user2'],
      createdAt: '2025-05-01T10:00:00.000Z',
      updatedAt: '2025-05-04T10:00:00.000Z',
      read: true
    },
    {
      _id: '2',
      userId: 'user2',
      type: 'GROUP',
      name: 'Dev Team',
      avatar:
        'https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      lastMessage: 'Code pushed to main branch!',
      participants: ['user2', 'user3', 'user4'],
      createdAt: '2025-04-28T14:30:00.000Z',
      updatedAt: '2025-05-03T09:20:00.000Z',
      read: false
    },
    {
      _id: '3',
      userId: 'user3',
      type: 'PRIVATE',
      name: 'Bob',
      avatar:
        'https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      lastMessage: 'Let’s catch up later.',
      participants: ['user3', 'user1'],
      createdAt: '2025-05-02T08:45:00.000Z',
      updatedAt: '2025-05-04T08:45:00.000Z',
      read: false
    }
  ]

  const currentChat = chats.find((chat) => chat._id === chatId)
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
                      <span className='text-muted-foreground ml-auto'>{format(addHours(today, 4), 'E, h:m b')}</span>
                    </Button>
                    <Button variant='ghost' className='justify-start font-normal'>
                      Tomorrow
                      <span className='text-muted-foreground ml-auto'>{format(addDays(today, 1), 'E, h:m b')}</span>
                    </Button>
                    <Button variant='ghost' className='justify-start font-normal'>
                      This weekend
                      <span className='text-muted-foreground ml-auto'>{format(nextSaturday(today), 'E, h:m b')}</span>
                    </Button>
                    <Button variant='ghost' className='justify-start font-normal'>
                      Next week
                      <span className='text-muted-foreground ml-auto'>{format(addDays(today, 7), 'E, h:m b')}</span>
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
      {currentChat ? (
        <div className='flex flex-1 flex-col'>
          <div className='flex items-start p-4'>
            <div className='flex items-start gap-4 text-sm'>
              <Avatar>
                <AvatarImage src={currentChat?.avatar} alt={currentChat.name} />
                <AvatarFallback>
                  {currentChat?.name
                    ?.split(' ')
                    .map((chunk) => chunk[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className='grid gap-1'>
                <div className='font-semibold'>{currentChat.name}</div>
                {currentChat.createdAt && (
                  <div className='text-muted-foreground ml-auto text-xs'>
                    {format(new Date(currentChat.createdAt), 'PPpp')}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Separator />
          {/* Render messages */}
          <ScrollArea className='flex-1 overflow-y-auto p-4 text-sm whitespace-pre-wrap'>
            <div>test</div>
          </ScrollArea>
          <Separator className='mt-auto' />
          <div className='p-4'>
            <form>
              <div className='flex items-end gap-4'>
                <Input className='flex-1 resize-none p-4' placeholder={`Reply ${currentChat.name}...`} />
                <Button size='icon' className='ml-auto'>
                  <SendHorizontal />
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className='text-muted-foreground p-8 text-center'>Select a chat to start messaging</div>
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
