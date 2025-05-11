import httpRequest from '~/config/http-request'

class ConversationsService {
  // Tạo cuộc trò chuyện mới
  async createConversation(participants: string[]) {
    const res = await httpRequest.post('/chat/conversations', { participants })
    return res.data.data
  }

  // Lấy danh sách cuộc trò chuyện
  async getConversations(page = 1, limit = 10, filter = 'all', searchQuery = '') {
    console.log('Calling getConversations API with:', { page, limit, filter, searchQuery })
    const res = await httpRequest.get(`/chat?page=${page}&limit=${limit}&filter=${filter}&search=${searchQuery}`)
    console.log('API response for getConversations:', res.data)
    return res.data.data
  }

  // Lấy thông tin cuộc trò chuyện theo ID
  async getConversation(conversationId: string) {
    const res = await httpRequest.get(`/chat/${conversationId}`)
    return res.data.data
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

  // Xóa cuộc trò chuyện
  async deleteConversation(conversationId: string) {
    const res = await httpRequest.delete(`/chat/${conversationId}`);
    return res.data.data;
  }

  // Thêm các phương thức để quản lý archive
  // Lấy danh sách cuộc trò chuyện đã lưu trữ
  async getArchivedChats(page = 1, limit = 10, searchQuery = '') {
    console.log('Calling getArchivedChats API with:', { page, limit, searchQuery })
    const res = await httpRequest.get(`/chat/archived?page=${page}&limit=${limit}&search=${searchQuery}`)
    console.log('API response:', res.data)
    return res.data.data
  }

  // Lưu trữ cuộc trò chuyện
  async archiveChat(chatId: string) {
    console.log('Calling archiveChat API for:', chatId)
    const res = await httpRequest.put(`/chat/${chatId}/archive`)
    console.log('API response for archiveChat:', res.data)
    return res.data.data
  }

  // Bỏ lưu trữ cuộc trò chuyện
  async unarchiveChat(chatId: string) {
    console.log('Calling unarchiveChat API for:', chatId)
    const res = await httpRequest.put(`/chat/${chatId}/unarchive`)
    console.log('API response for unarchiveChat:', res.data)
    return res.data.data
  }

  // Ghim/bỏ ghim tin nhắn
  async pinMessage(messageId: string) {
    console.log('Calling pinMessage API for:', messageId)
    const res = await httpRequest.put(`/chat/messages/${messageId}/pin`)
    console.log('API response for pinMessage:', res.data)
    return res.data.data
  }

  // Lấy tin nhắn đã ghim
  async getPinnedMessages(chatId: string) {
    console.log('Calling getPinnedMessages API for:', chatId)
    const res = await httpRequest.get(`/chat/${chatId}/pinned-messages`)
    console.log('API response for getPinnedMessages:', res.data)
    return res.data.data
  }

  // Tạo nhóm chat mới
  async createGroupConversation(data: { participants: string[], name: string, avatar?: string }) {
    console.log('Calling createGroupConversation API with:', data)
    const res = await httpRequest.post('/chat/group', data)
    console.log('API response for createGroupConversation:', res.data)
    return res.data.data
  }

  // Thêm các phương thức quản lý nhóm
  // Cập nhật thông tin nhóm
  async updateGroupConversation(groupId: string, data: { name?: string, avatar?: string }) {
    console.log('Calling updateGroupConversation API with:', { groupId, data })
    const res = await httpRequest.put(`/chat/group/${groupId}`, data)
    console.log('API response for updateGroupConversation:', res.data)
    return res.data
  }

  // Thêm thành viên vào nhóm
  async addGroupMembers(groupId: string, userIds: string[]) {
    console.log('Calling addGroupMembers API with:', { groupId, userIds })
    const res = await httpRequest.post(`/chat/group/${groupId}/members`, { userIds })
    console.log('API response for addGroupMembers:', res.data)
    return res.data
  }

  // Xóa thành viên khỏi nhóm
  async removeGroupMember(groupId: string, userId: string) {
    console.log('Calling removeGroupMember API with:', { groupId, userId })
    const res = await httpRequest.delete(`/chat/group/${groupId}/members/${userId}`)
    console.log('API response for removeGroupMember:', res.data)
    return res.data
  }

  // Rời khỏi nhóm
  async leaveGroupConversation(groupId: string) {
    console.log('Calling leaveGroupConversation API with:', { groupId })
    const res = await httpRequest.post(`/chat/group/${groupId}/leave`)
    console.log('API response for leaveGroupConversation:', res.data)
    return res.data
  }
}

const conversationsService = new ConversationsService()
export default conversationsService
