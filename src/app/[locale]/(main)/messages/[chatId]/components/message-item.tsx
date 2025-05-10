import { MoreVertical, Pin, PinOff, Reply, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { MESSAGE_STATUS } from '~/constants/enums'
import { usePinMessage } from '~/hooks/data/chat.hooks'
import { formatMessageContent } from '~/lib/utils'

interface MessageItemProps {
  message: any
  isCurrentUser: boolean
  chatId: string
  onReply?: (message: any) => void
  onDelete?: (messageId: string) => void
}

export function MessageItem({ message, isCurrentUser, chatId, onReply, onDelete }: MessageItemProps) {
  const { mutate: pinMessage } = usePinMessage(chatId)
  
  const handleReply = () => {
    if (onReply) onReply(message)
  }
  
  const handleDelete = () => {
    if (onDelete) onDelete(message._id)
  }

  return (
    <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={message.senderId?.avatar} />
          <AvatarFallback>{message.senderId?.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3 relative group`}>
        {!isCurrentUser && (
          <div className="text-xs font-medium mb-1">{message.senderId?.name}</div>
        )}
        
        <div className="text-sm break-words">
          {formatMessageContent(message.content)}
        </div>
        
        {message.isPinned && (
          <div className="absolute -top-3 right-2 text-xs bg-background px-2 py-0.5 rounded-full flex items-center">
            <Pin className="h-3 w-3 mr-1" />
            <span>Ghim</span>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isCurrentUser && message.status === MESSAGE_STATUS.SEEN && (
            <span className="ml-1 text-blue-500">✓✓</span>
          )}
        </div>
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => pinMessage(message._id)}>
                {message.isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    <span>Bỏ ghim</span>
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    <span>Ghim tin nhắn</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReply}>
                <Reply className="mr-2 h-4 w-4" />
                <span>Trả lời</span>
              </DropdownMenuItem>
              {isCurrentUser && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
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
