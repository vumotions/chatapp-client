import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { cn } from '~/lib/utils'

type Props = {
  src?: string
  fallback?: string
  className?: string
}

function ChatBubbleAvatar({ fallback, src, className }: Props) {
  return (
    <Avatar className={cn('h-8 w-8 rounded-full', className)}>
      <AvatarImage src={src} alt='Avatar' />
      <AvatarFallback className='rounded-lg'>{fallback}</AvatarFallback>
    </Avatar>
  )
}

export default ChatBubbleAvatar
