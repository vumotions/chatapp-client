import { useParams } from 'next/navigation'

function useChat() {
  const chatId = useParams()

  return chatId
}

export default useChat
