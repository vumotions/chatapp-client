import httpRequest from '~/config/http-request'
import { SuccessResponse } from '~/types/api.types'

// Định nghĩa các kiểu dữ liệu
export interface SearchUser {
  _id: string
  name: string
  username: string
  avatar: string
}

export interface SearchPost {
  _id: string
  content: string
  media: Array<{
    url: string
    type: string
  }>
  post_type: string
  created_at: string
  userId: SearchUser
}

export interface SearchConversation {
  _id: string
  name: string
  type: string
  lastMessage: {
    content: string
    createdAt: string
  }
  participants: SearchUser[]
  createdAt: string
  updatedAt: string
}

export interface SearchAllResults {
  users: SearchUser[]
  posts: SearchPost[]
  conversations: SearchConversation[]
}

class SearchService {
  // Tìm kiếm tất cả
  searchAll(query: string) {
    return httpRequest.get<SuccessResponse<SearchAllResults>>(`/search?q=${encodeURIComponent(query)}`)
  }

  // Tìm kiếm người dùng
  searchUsers(query: string) {
    return httpRequest.get<SuccessResponse<SearchUser[]>>(`/search/users?q=${encodeURIComponent(query)}`)
  }

  // Tìm kiếm bài viết
  searchPosts(query: string) {
    return httpRequest.get<SuccessResponse<SearchPost[]>>(`/search/posts?q=${encodeURIComponent(query)}`)
  }

  // Tìm kiếm cuộc trò chuyện
  searchConversations(query: string) {
    return httpRequest.get<SuccessResponse<SearchConversation[]>>(
      `/search/conversations?q=${encodeURIComponent(query)}`
    )
  }
}

const searchService = new SearchService()
export default searchService
