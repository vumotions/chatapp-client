import { ReactNode } from 'react'
import MessageLoading from './message-loading'

type Props = {
  children: ReactNode
  isLoading?: boolean
  className?: string
}
function ChatBubbleMessage({ children, isLoading = false, className }: Props) {
  return isLoading ? <MessageLoading /> : <div className={className}>{children}</div>
}

export default ChatBubbleMessage
