import httpRequest from '~/config/http-request'
import { CreateGroupChatData } from '~/types/chat.types'

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
    const res = await httpRequest.delete(`/chat/messages/${messageId}`)
    return res.data.data
  }

  async editMessage(messageId: string, content: string) {
    const res = await httpRequest.put(`/chat/messages/${messageId}`, { content })
    return res.data.data
  }

  // Sử dụng editMessage thay vì updateMessage
  async updateMessage(messageId: string, content: string) {
    return this.editMessage(messageId, content)
  }

  // Cập nhật phương thức xóa cuộc trò chuyện
  async deleteConversation(conversationId: string, action: 'hide' | 'delete' = 'hide') {
    console.log('Deleting conversation:', { conversationId, action })
    const res = await httpRequest.delete(`/chat/${conversationId}?action=${action}`)
    return res.data.data
  }

  // Thêm phương thức xóa nhóm (cho admin)
  async deleteGroupConversation(conversationId: string) {
    console.log('Deleting group conversation:', { conversationId })
    const res = await httpRequest.delete(`/chat/${conversationId}?action=delete`)
    return res.data.data
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
  async createGroupConversation(data: CreateGroupChatData) {
    const res = await httpRequest.post('/chat/group', data)
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

  // Cập nhật thông tin nhóm
  async updateGroupConversation(
    conversationId: string,
    data: { name?: string; avatar?: string; groupType?: string; requireApproval?: boolean }
  ) {
    console.log('Updating group conversation:', { conversationId, data })
    // Sửa lại endpoint để khớp với route trên server
    const res = await httpRequest.put(`/chat/group/${conversationId}`, data)
    return res.data
  }

  // Cập nhật phương thức rời khỏi nhóm
  async leaveGroupConversation(conversationId: string) {
    console.log('Leaving group conversation:', { conversationId })
    const res = await httpRequest.post(`/chat/group/${conversationId}/leave`)
    return res.data.data
  }

  // Tạo link mời
  async generateInviteLink(conversationId: string) {
    console.log('Generating invite link for:', conversationId)
    // Sửa lại endpoint để khớp với server
    const res = await httpRequest.post(`/chat/group/${conversationId}/invite-link`)
    console.log('Generate invite link response:', res.data)
    return res.data
  }

  // Tham gia nhóm qua link mời
  async joinGroupByInviteLink(inviteLink: string) {
    console.log('Joining group by invite link:', inviteLink)
    const res = await httpRequest.post(`/chat/group/join/${inviteLink}`)
    return res.data.data
  }

  // Lấy thông tin nhóm qua link mời
  async getGroupByInviteLink(inviteLink: string) {
    console.log('Getting group by invite link:', inviteLink)
    const res = await httpRequest.get(`/chat/group/join/${inviteLink}`)
    return res.data.data
  }

  // Cập nhật vai trò thành viên
  async updateGroupMemberRole(
    conversationId: string,
    data: {
      userId: string
      role: string
      permissions: Record<string, boolean>
      customTitle?: string
    }
  ) {
    console.log('Sending update member role request:', { conversationId, data })
    // Sửa lại endpoint để khớp với route trên server
    return httpRequest.put(`/chat/group/${conversationId}/members/role`, data)
  }

  // Lấy danh sách yêu cầu tham gia
  async getJoinRequests(conversationId: string) {
    const res = await httpRequest.get(`/chat/conversations/group/${conversationId}/join-requests`)
    return res.data.data
  }

  // Phê duyệt yêu cầu tham gia
  async approveJoinRequest(conversationId: string, userId: string) {
    const res = await httpRequest.post(`/chat/conversations/group/${conversationId}/approve-request/${userId}`)
    return res.data.data
  }

  // Từ chối yêu cầu tham gia
  async rejectJoinRequest(conversationId: string, userId: string) {
    const res = await httpRequest.post(`/chat/conversations/group/${conversationId}/reject-request/${userId}`)
    return res.data.data
  }

  // Thêm phương thức kiểm tra quyền truy cập vào chat
  async checkChatAccess(chatId: string) {
    const res = await httpRequest.get(`/chat/access/${chatId}`)
    return res.data.data
  }

  // Thêm phương thức chuyển quyền chủ nhóm
  async transferOwnership(conversationId: string, newOwnerId: string) {
    console.log('Transferring ownership:', { conversationId, newOwnerId })
    const res = await httpRequest.post(`/chat/group/${conversationId}/transfer-ownership`, {
      newOwnerId
    })
    return res.data.data
  }

  // Thêm phương thức giải tán nhóm
  async disbandGroup(conversationId: string) {
    console.log('Disbanding group:', { conversationId })
    const res = await httpRequest.delete(`/chat/group/${conversationId}/disband`)
    return res.data.data
  }
}

const conversationsService = new ConversationsService()
export default conversationsService
