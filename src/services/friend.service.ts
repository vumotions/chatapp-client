import httpRequest from '~/config/http-request'
import { SuccessResponse } from '~/types/api.types'

export interface Friend {
  username: string
  status: string
  _id: string
  name: string
  avatar: string
  mutualFriends?: number // Số bạn chung, chỉ có ở friend suggestions
}

export interface FriendRequest {
  _id: string
  senderId: string
  receiverId: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

// Thêm interface cho response phân trang
export interface PaginatedResponse<T> {
  suggestions: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class FriendService {
  // Gửi lời mời kết bạn
  sendFriendRequest(receiverId: string) {
    return httpRequest.post<SuccessResponse<null>>('/friends/add', {
      userId: receiverId
    })
  }

  // Chấp nhận lời mời kết bạn
  acceptFriendRequest(senderId: string) {
    return httpRequest.post<SuccessResponse<FriendRequest>>('/friends/accept', {
      userId: senderId
    })
  }

  // Từ chối lời mời kết bạn
  rejectFriendRequest(senderId: string) {
    return httpRequest.post<SuccessResponse<null>>('/friends/reject', {
      userId: senderId
    })
  }

  // Hủy lời mời kết bạn đã gửi
  cancelFriendRequest(receiverId: string) {
    return httpRequest.post<SuccessResponse<null>>('/friends/cancel', {
      userId: receiverId
    })
  }

  // Cập nhật method để hỗ trợ tìm kiếm
  getFriendsList(search = '') {
    return httpRequest.get<SuccessResponse<Friend[]>>(`/friends?search=${encodeURIComponent(search)}`)
  }

  // Lấy danh sách gợi ý bạn bè với phân trang
  getFriendSuggestions(page = 1, limit = 10) {
    return httpRequest.get<SuccessResponse<PaginatedResponse<Friend>>>(`/friends/suggestions?page=${page}&limit=${limit}`)
  }

  // Thêm phương thức removeFriend
  removeFriend(friendId: string) {
    return httpRequest.delete(`/friends/remove/${friendId}`)
  }

  // Lấy trạng thái kết bạn với một người dùng
  getFriendStatus(userId: string) {
    return httpRequest.get<SuccessResponse<{ status: string | null }>>(`/friends/status/${userId}`)
  }

  // Thêm phương thức searchUsers để tìm kiếm tất cả người dùng
  searchUsers(query = '') {
    return httpRequest.get<SuccessResponse<Friend[]>>(`/friends/search?q=${encodeURIComponent(query)}`)
  }
}

const friendService = new FriendService()
export default friendService
