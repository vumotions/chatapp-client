'use client'

import { addDays, addHours, format, nextSaturday } from 'date-fns'

import { Archive, ArchiveX, Clock, Forward, MoreVertical, Reply, ReplyAll, SendHorizontal, Trash2 } from 'lucide-react'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import ChatBubble from '~/components/chat/chat-bubble'
import ChatBubbleAvatar from '~/components/chat/chat-bubble-avatar'
import ChatBubbleMessage from '~/components/chat/chat-bubble-message'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Textarea } from '~/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import nextEnv from '~/config/next-env'
import { Mail } from '../data'

type Props = {
  mail: Mail | null
}

export function ChatDisplay({ mail }: Props) {
  const today = new Date()
  const [socket, setSocket] = useState<Socket | null>(null)
  useEffect(() => {
    const socket = io(nextEnv.NEXT_PUBLIC_SERVER_URL, {
      auth: {
        Authorization: `Bearer ${'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODBhOTYyMGYwMGQzYzI3MWNjYmNiODEiLCJ0b2tlblR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJ2ZXJpZnkiOiJWRVJJRklFRCIsImlhdCI6MTc0NTg3Nzg1MywiZXhwIjoxNzQ1ODc4NzUzfQ.-AMCfYtF3fhG3Z3yga8XSZzXfd_9syaRmGu4rCsgCA0'}`,
        random: Math.floor(Math.random() * 100)
      }
    })
    setSocket(socket)

    socket.on('connect', () => console.log(socket.id))
    socket.on('greetings', (data) => console.log(data))

    socket.on('connect_error', (error) => {
      toast.error(error?.message)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <div className='sticky top-0 flex h-full max-h-[calc(100vh-64px)] flex-col'>
      <Button
        onClick={() => {
          socket?.emit('SEND_MESSAGE', {
            message: 'TEST 123'
          })
        }}
      >
        send message
      </Button>
      <div className='flex items-center p-2'>
        <div className='flex items-center gap-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!mail}>
                <Archive className='h-4 w-4' />
                <span className='sr-only'>Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!mail}>
                <ArchiveX className='h-4 w-4' />
                <span className='sr-only'>Move to junk</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to junk</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!mail}>
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
                  <Button variant='ghost' size='icon' disabled={!mail}>
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
              <Button variant='ghost' size='icon' disabled={!mail}>
                <Reply className='h-4 w-4' />
                <span className='sr-only'>Reply</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!mail}>
                <ReplyAll className='h-4 w-4' />
                <span className='sr-only'>Reply all</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' disabled={!mail}>
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
            <Button variant='ghost' size='icon' disabled={!mail}>
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
      {mail ? (
        <div className='flex flex-1 flex-col'>
          <div className='flex items-start p-4'>
            <div className='flex items-start gap-4 text-sm'>
              <Avatar>
                <AvatarImage alt={mail.name} />
                <AvatarFallback>
                  {mail.name
                    .split(' ')
                    .map((chunk) => chunk[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className='grid gap-1'>
                <div className='font-semibold'>{mail.name}</div>
                <div className='line-clamp-1 text-xs'>{mail.subject}</div>
                <div className='line-clamp-1 text-xs'>
                  <span className='font-medium'>Reply-To:</span> {mail.email}
                </div>
              </div>
            </div>
            {mail.date && (
              <div className='text-muted-foreground ml-auto text-xs'>{format(new Date(mail.date), 'PPpp')}</div>
            )}
          </div>
          <Separator />
          {/* Render messages */}
          <ScrollArea className='flex-1 overflow-y-auto p-4 text-sm whitespace-pre-wrap'>
            <div>
              <ChatBubble variant='sent'>
                <div>
                  <ChatBubbleAvatar fallback='V' />
                  <ChatBubbleMessage>Lam gi day</ChatBubbleMessage>
                </div>
              </ChatBubble>
              <ChatBubble variant='received'>
                <div>
                  <ChatBubbleAvatar fallback='H' />
                  <ChatBubbleMessage isLoading>Hoi lam gi</ChatBubbleMessage>
                </div>
              </ChatBubble>
            </div>
          </ScrollArea>
          <Separator className='mt-auto' />
          <div className='p-4'>
            <form>
              <div className='flex items-end gap-4'>
                <Textarea className='max-h-40 flex-1 resize-none p-4' rows={1} placeholder={`Reply ${mail.name}...`} />
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
