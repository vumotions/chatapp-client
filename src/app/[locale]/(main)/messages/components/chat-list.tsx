import { formatDistanceToNow } from 'date-fns'
import { useParams, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { Chat } from '~/types/common.types'

export function ChatList() {
  const { chatId } = useParams()
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')

  const [list, setList] = useState<Chat[]>([
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
      lastMessage: 'Let’s catch up later. asd asfasdasdfasdlfjasd;flsadjf;sdaljfdas;fjkadfsdafldas;kjf',
      participants: ['user3', 'user1'],
      createdAt: '2025-05-02T08:45:00.000Z',
      updatedAt: '2025-05-04T08:45:00.000Z',
      read: false
    }
  ])

  const items = useMemo(() => {
    return filter === 'unread' ? list.filter((item) => !item.read) : list
  }, [list, filter])

  return (
    <ScrollArea className='h-[calc(100vh-120px)]'>
      <div className='flex flex-col gap-2 p-4 pt-0'>
        {items.map((item) => (
          <Link
            href={`/messages/${item._id}`}
            key={item._id}
            className={cn(
              'hover:bg-accent flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all',
              {
                'bg-muted': chatId === item._id
              }
            )}
          >
            <div className='flex w-full flex-col gap-1'>
              <div className='flex items-center'>
                <div className='flex items-center gap-2'>
                  <Avatar>
                    <AvatarImage src={item?.avatar} alt={item.name} />
                    <AvatarFallback>
                      {item?.name
                        ?.split(' ')
                        .map((chunk) => chunk[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className='flex items-center gap-2'>
                      <div className='font-semibold'>{item.name}</div>
                      <div className='text-muted-foreground text-xs font-medium'>
                        {item.type === 'GROUP' && <span>{item.participants.length} members</span>}
                      </div>
                      {!item.read && <span className='flex h-2 w-2 rounded-full bg-blue-600' />}{' '}
                    </div>
                    <span
                      className={cn('inline-block max-w-[200px] truncate', {
                        'text-muted-foreground': item.read
                      })}
                    >
                      {item.lastMessage}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    'ml-auto pl-2 text-xs',
                    chatId === item._id ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true
                  })}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </ScrollArea>
  )
}
