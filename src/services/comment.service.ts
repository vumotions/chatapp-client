import httpRequest from '~/config/http-request'
import { useSocket } from '~/providers/socket-provider'

interface CommentData {
  content: string
  parentId?: string
  tempId?: string
}

class CommentService {
  async getComments(postId: string, page = 1, limit = 10, parentId?: string) {
    try {
      const params = {
        page,
        limit,
        postId,
        ...(parentId && { parentId })
      }
      
      const response = await httpRequest.get(`/posts/comments`, { params })
      
      // Đảm bảo dữ liệu trả về có cấu trúc đúng
      console.log('Comment API Response:', response.data)
      
      return response
    } catch (error) {
      console.error('Error in getComments:', error)
      throw error
    }
  }

  async createComment(postId: string, data: CommentData) {
    // Kiểm tra postId hợp lệ trước khi gọi API
    if (!postId) {
      console.error('Invalid postId for createComment:', postId)
      return Promise.reject(new Error('Invalid postId'))
    }
    
    // Log để debug
    console.log(`Creating comment:`, { postId, ...data })
    
    return httpRequest.post('/posts/comments', { 
      postId, 
      content: data.content,
      parentId: data.parentId,
      tempId: data.tempId // Thêm tempId vào request
    })
  }
  
  // Phương thức để tham gia vào room của bài viết
  joinPostRoom(socket: any, postId: string) {
    if (!socket || !postId) return
    socket.emit('JOIN_POST_ROOM', postId)
  }
  
  // Phương thức để tham gia vào room của comment
  joinCommentRoom(socket: any, commentId: string) {
    if (!socket || !commentId) return
    socket.emit('JOIN_COMMENT_ROOM', commentId)
  }
  
  // Phương thức để rời khỏi room của bài viết
  leavePostRoom(socket: any, postId: string) {
    if (!socket || !postId) return
    socket.emit('LEAVE_POST_ROOM', postId)
  }
  
  // Phương thức để rời khỏi room của comment
  leaveCommentRoom(socket: any, commentId: string) {
    if (!socket || !commentId) return
    socket.emit('LEAVE_COMMENT_ROOM', commentId)
  }

  async likeComment(commentId: string) {
    if (!commentId) {
      console.error('Invalid commentId for likeComment:', commentId)
      return Promise.reject(new Error('Invalid commentId'))
    }
    
    console.log(`Liking comment:`, commentId)
    
    return httpRequest.post('/posts/comments/like', { commentId })
  }

  async unlikeComment(commentId: string) {
    if (!commentId) {
      console.error('Invalid commentId for unlikeComment:', commentId)
      return Promise.reject(new Error('Invalid commentId'))
    }
    
    console.log(`Unliking comment:`, commentId)
    
    return httpRequest.delete(`/posts/comments/like/${commentId}`)
  }
}

export default new CommentService()








