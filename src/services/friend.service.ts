import httpRequest from '~/config/http-request'
import { SuccessResponse } from '~/types/api.types'

export interface Friend {
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

  // Lấy danh sách bạn bè
  getFriendsList() {
    return httpRequest.get<SuccessResponse<Friend[]>>('/friends')
  }

  // Lấy danh sách gợi ý bạn bè
  getFriendSuggestions() {
    return httpRequest.get<SuccessResponse<Friend[]>>('/friends/suggestions')
  }
}

const friendService = new FriendService()
export default friendService
