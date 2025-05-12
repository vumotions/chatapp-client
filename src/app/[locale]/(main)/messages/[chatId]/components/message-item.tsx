import { MoreVertical, Pin, PinOff, Reply, Trash2, Check, CheckCheck, Eye } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { MESSAGE_STATUS } from '~/constants/enums'
import { usePinMessage } from '~/hooks/data/chat.hooks'
import { formatMessageContent } from '~/lib/utils'
import { useState } from 'react'
import httpRequest from '~/config/http-request'

interface MessageItemProps {
  message: any
  isCurrentUser: boolean
  chatId: string
  onReply?: (message: any) => void
  onDelete?: (messageId: string) => void
}

export function MessageItem({ message, isCurrentUser, chatId, onReply, onDelete }: MessageItemProps) {
  const { mutate: pinMessage } = usePinMessage(chatId)
  const [readers, setReaders] = useState<Array<{ _id: string; name: string; avatar?: string }>>([])
  const [isLoadingReaders, setIsLoadingReaders] = useState(false)

  const handleReply = () => {
    if (onReply) onReply(message)
  }

  const handleDelete = () => {
    if (onDelete) onDelete(message._id)
  }

  const fetchReaders = async () => {
    if (!message.readBy || message.readBy.length === 0 || isLoadingReaders) return

    setIsLoadingReaders(true)
    try {
      const promises = message.readBy.map(async (userId: string) => {
        try {
          const response = await httpRequest.get(`/user/${userId}`)
          return response.data.data
        } catch (error) {
          console.error('Error fetching user info:', error)
          return { _id: userId, name: 'Unknown User' }
        }
      })

      const users = await Promise.all(promises)
      setReaders(users)
    } catch (error) {
      console.error('Error fetching readers:', error)
    } finally {
      setIsLoadingReaders(false)
    }
  }

  return (
    <div className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <Avatar className='mr-2 h-8 w-8'>
          <AvatarImage src={message.senderId?.avatar} />
          <AvatarFallback>{message.senderId?.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={`max-w-[70%] ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'} group relative rounded-lg p-3`}
      >
        {!isCurrentUser && <div className='mb-1 text-xs font-medium'>{message.senderId?.name}</div>}

        <div className='text-sm break-words'>{formatMessageContent(message.content)}</div>

        {message.isPinned && (
          <div className='bg-background absolute -top-3 right-2 flex items-center rounded-full px-2 py-0.5 text-xs'>
            <Pin className='mr-1 h-3 w-3' />
            <span>Ghim</span>
          </div>
        )}

        <div className='text-muted-foreground mt-1 flex items-center justify-end text-xs'>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isCurrentUser && (
            <span className='ml-1'>
              {message.status === MESSAGE_STATUS.SENT && <Check className='inline h-3 w-3' />}
              {message.status === MESSAGE_STATUS.DELIVERED && <Check className='inline h-3 w-3' />}
              {message.status === MESSAGE_STATUS.SEEN && (
                <Popover
                  onOpenChange={(open) => {
                    if (open) {
                      fetchReaders()
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <span className='cursor-pointer text-blue-500 hover:underline'>
                      <CheckCheck className='inline h-3 w-3' />
                      {message.readBy && message.readBy.length > 0 && (
                        <span className='ml-1 text-xs'>({message.readBy.length})</span>
                      )}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className='w-60 p-0' side='top'>
                    <div className='py-2'>
                      <h4 className='px-3 py-1 text-sm font-medium'>Đã xem ({message.readBy?.length || 0})</h4>
                      <div className='max-h-40 overflow-y-auto'>
                        {isLoadingReaders ? (
                          <div className='text-muted-foreground px-3 py-2 text-sm'>Đang tải...</div>
                        ) : readers.length > 0 ? (
                          readers.map((reader) => (
                            <div key={reader._id} className='hover:bg-muted flex items-center px-3 py-2'>
                              <Avatar className='mr-2 h-6 w-6'>
                                <AvatarImage src={reader.avatar} />
                                <AvatarFallback>{reader.name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <span className='text-sm'>{reader.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className='text-muted-foreground px-3 py-2 text-sm'>Chưa có ai xem</div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </span>
          )}
        </div>

        <div className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-6 w-6'>
                <MoreVertical className='h-4 w-4' />
                <span className='sr-only'>More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => pinMessage(message._id)}>
                {message.isPinned ? (
                  <>
                    <PinOff className='mr-2 h-4 w-4' />
                    <span>Bỏ ghim</span>
                  </>
                ) : (
                  <>
                    <Pin className='mr-2 h-4 w-4' />
                    <span>Ghim tin nhắn</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReply}>
                <Reply className='mr-2 h-4 w-4' />
                <span>Trả lời</span>
              </DropdownMenuItem>
              {isCurrentUser && (
                <DropdownMenuItem onClick={handleDelete} className='text-destructive'>
                  <Trash2 className='mr-2 h-4 w-4' />
                  <span>Xóa tin nhắn</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
