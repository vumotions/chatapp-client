import React from 'react'
import { cn } from '~/lib/utils'

type Props = React.HTMLAttributes<HTMLDivElement> & {
  timestamp: string
}

function ChatBubbleTimestamp({ timestamp, className, ...props }: Props) {
  return (
    <div className={cn('mt-2 text-right text-xs', className)} {...props}>
      {timestamp}
    </div>
  )
}

export default ChatBubbleTimestamp
