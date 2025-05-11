import { Archive, MoreHorizontal, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Separator } from '~/components/ui/separator'
import { useArchiveChat } from '~/hooks/data/chat.hooks'
import { toast } from 'sonner'
import { useRouter } from 'next/router'
import useMediaQuery from '~/hooks/use-media-query'

interface ChatHeaderProps {
  chat: any
  otherUser?: any
}

export function ChatHeader({ chat, otherUser }: ChatHeaderProps) {
  const { archiveChat, unarchiveChat } = useArchiveChat()
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  // Xử lý khi click vào nút archive/unarchive
  const handleArchiveToggle = () => {
    if (!chat?._id) return
    
    console.log('Archive toggle in header', {
      chatId: chat._id,
      isArchived: chat.isArchived
    })
    
    if (chat.isArchived) {
      unarchiveChat.mutate(chat._id, {
        onSuccess: () => {
          // Chuyển hướng về trang chat sau khi bỏ lưu trữ
          router.push(`/messages/${chat._id}`)
        }
      })
    } else {
      archiveChat.mutate(chat._id)
    }
  }
  
  return (
    <div className="flex items-center p-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={otherUser?.avatar || chat?.avatar} alt={otherUser?.name || chat?.name} />
        <AvatarFallback>{(otherUser?.name || chat?.name)?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="ml-2">
        <div className="font-medium">{otherUser?.name || chat?.name}</div>
        <div className="text-xs text-muted-foreground">
          {chat?.isArchived ? 'Archived' : 'Active'}
        </div>
      </div>
      
      {/* Chỉ hiển thị các nút này khi không phải mobile, vì trên mobile đã có ở header chính */}
      {!isMobile && (
        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleArchiveToggle}
                disabled={archiveChat.isPending || unarchiveChat.isPending}
              >
                <Archive className="h-4 w-4" />
                <span className="sr-only">
                  {chat?.isArchived ? 'Unarchive' : 'Archive'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {chat?.isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}


