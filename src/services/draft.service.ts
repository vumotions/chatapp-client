import httpRequest from '~/config/http-request'
import { IDraft } from '~/models/draft.model'

class DraftService {
  // Lưu draft message
  async saveDraft(draft: Omit<IDraft, '_id' | 'createdAt' | 'updatedAt'>) {
    const res = await httpRequest.post('/chat/drafts', draft)
    return res.data.data
  }

  // Cập nhật draft message
  async updateDraft(draftId: string, content: string, attachments?: any[]) {
    const res = await httpRequest.put(`/chat/drafts/${draftId}`, {
      content,
      attachments
    })
    return res.data.data
  }

  // Lấy draft message theo chatId
  async getDraftByChatId(chatId: string) {
    const res = await httpRequest.get(`/chat/drafts/${chatId}`)
    return res.data.data
  }

  // Xóa draft message
  async deleteDraft(draftId: string) {
    const res = await httpRequest.delete(`/chat/drafts/${draftId}`)
    return res.data.data
  }

  // Lấy tất cả draft messages của user
  async getAllDrafts() {
    const res = await httpRequest.get('/chat/drafts')
    return res.data.data
  }
}

const draftService = new DraftService()
export default draftService
