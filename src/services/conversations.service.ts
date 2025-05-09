import httpRequest from '~/config/http-request'

class ConversationsService {
  // Tạo cuộc trò chuyện mới
  async createConversation(participants: string[]) {
    const res = await httpRequest.post('/chat/conversations', { participants })
    return res.data.data
  }

  // Lấy danh sách cuộc trò chuyện
  async getConversations(page = 1, limit = 10, filter = 'all', searchQuery = '') {
    const res = await httpRequest.get(`/chat?page=${page}&limit=${limit}&filter=${filter}&search=${searchQuery}`);
    return res.data.data;
  }

  // Lấy tin nhắn của một cuộc trò chuyện
  async getMessages(chatId: string, page = 1, limit = 10) {
    const res = await httpRequest.get(`/chat/messages/${chatId}?page=${page}&limit=${limit}`)
    return res.data.data
  }

  // Đánh dấu cuộc trò chuyện đã đọc
  async markChatAsRead(chatId: string) {
    const res = await httpRequest.patch(`/chat/${chatId}/read`)
    return res.data.data
  }

  // Cập nhật các phương thức để sử dụng đúng endpoint
  async deleteMessage(messageId: string) {
    const res = await httpRequest.delete(`/chat/messages/${messageId}`);
    return res.data.data;
  }

  async editMessage(messageId: string, content: string) {
    const res = await httpRequest.put(`/chat/messages/${messageId}`, { content });
    return res.data.data;
  }

  // Sử dụng editMessage thay vì updateMessage
  async updateMessage(messageId: string, content: string) {
    return this.editMessage(messageId, content);
  }
}

const conversationsService = new ConversationsService()
export default conversationsService
