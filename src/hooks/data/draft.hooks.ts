import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import draftService from '~/services/draft.service'

// Hook để quản lý draft message cho một chat cụ thể
export const useDraftMessage = (chatId: string) => {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [draftContent, setDraftContent] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<any[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Lấy draft message hiện tại
  const { data: draft } = useQuery({
    queryKey: ['DRAFT', chatId],
    queryFn: () => draftService.getDraftByChatId(chatId),
    enabled: !!chatId && !!session?.user?._id,
    select: (response) => {
      const data = response.data?.data
      if (data) {
        setDraftContent(data.content || '')
        setDraftAttachments(data.attachments || [])
        setDraftId(data._id as string) // Cast to string type
      }
      setIsLoading(false)
      return response
    }
  })

  // Mutation để lưu draft
  const saveDraft = useMutation({
    mutationFn: (content: string) => {
      if (draftId) {
        return draftService.updateDraft(draftId, content, draftAttachments)
      } else {
        return draftService.saveDraft({
          chatId,
          userId: session?.user?._id as string,
          content,
          attachments: draftAttachments
        })
      }
    },
    onSuccess: (response) => {
      console.log('Draft save response:', response)
      // Truy cập đúng cấu trúc dữ liệu
      const id = response.data?._id || response._id
      setDraftId(id as string)
      queryClient.invalidateQueries({ queryKey: ['DRAFT', chatId] })
    }
  })

  // Mutation để xóa draft
  const deleteDraft = useMutation({
    mutationFn: () => {
      if (!draftId) return Promise.resolve(null)
      return draftService.deleteDraft(draftId)
    },
    onSuccess: () => {
      setDraftId(null)
      setDraftContent('')
      setDraftAttachments([])
      queryClient.invalidateQueries({ queryKey: ['DRAFT', chatId] })
    }
  })

  // Cập nhật nội dung draft
  const updateDraftContent = (content: string) => {
    setDraftContent(content)
  }

  // Thêm attachment vào draft
  const addAttachment = (attachment: any) => {
    setDraftAttachments((prev) => [...prev, attachment])
  }

  // Xóa attachment khỏi draft
  const removeAttachment = (attachmentId: string) => {
    setDraftAttachments((prev) => prev.filter((att) => att.id !== attachmentId))
  }

  // Tự động lưu draft khi người dùng ngừng gõ
  useEffect(() => {
    if (!chatId || !session?.user?._id || draftContent.trim() === '') return

    const timeoutId = setTimeout(() => {
      saveDraft.mutate(draftContent)
    }, 1000) // Lưu sau 1 giây ngừng gõ

    return () => clearTimeout(timeoutId)
  }, [draftContent, chatId, session?.user?._id])

  return {
    draftContent,
    draftAttachments,
    draftId,
    isLoading,
    updateDraftContent,
    addAttachment,
    removeAttachment,
    saveDraft: () => saveDraft.mutate(draftContent),
    deleteDraft: () => deleteDraft.mutate(),
    isDraftSaving: saveDraft.isPending
  }
}

// Hook để lấy tất cả draft messages
export const useAllDrafts = () => {
  return useQuery({
    queryKey: ['ALL_DRAFTS'],
    queryFn: () => draftService.getAllDrafts()
  })
}
