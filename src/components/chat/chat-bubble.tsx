import { ReactNode } from 'react'
import { cn } from '~/lib/utils'
import ChatBubbleAvatar from './chat-bubble-avatar'

type Props = {
  variant: 'sent' | 'received'
  children: ReactNode
  avatarUrl?: string
}

function ChatBubble({ children, variant, avatarUrl }: Props) {
  const bubbleStyle =
    variant === 'sent' ? 'bg-muted text-white self-end flex-row-reverse' : 'bg-primary text-black self-start'

  return (
    <div className='flex w-full'>
      {variant === 'received' && avatarUrl && <ChatBubbleAvatar src={avatarUrl} />}
      <div className={cn('group relative flex w-max max-w-[75%] items-end gap-2', bubbleStyle)}>{children}</div>
    </div>
  )
}

export default ChatBubble
