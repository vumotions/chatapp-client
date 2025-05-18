import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckConversationAccess } from './data/chat.hooks'
import { toast } from 'sonner'

export function useProtectedChat(chatId: string) {
  const router = useRouter()
  const { isLoading, isError, data } = useCheckConversationAccess(chatId)

  useEffect(() => {
    if (isError) {
      toast.error('Không thể truy cập đoạn chat')
      router.push('/messages')
    }
  }, [isError, router])

  return {
    isLoading,
    isError,
    hasAccess: !isError && !isLoading,
    data
  }
}
