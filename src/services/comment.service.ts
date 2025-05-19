import { Socket } from 'socket.io-client'
import httpRequest from '~/config/http-request'

class CommentService {
  // Lấy comments của một bài viết
  async getComments(postId: string, page = 1, limit = 10, parentId?: string) {
    try {
      // Kiểm tra tham số đầu vào
      if (!postId) {
        console.error('postId is required for getComments')
        throw new Error('postId is required')
      }
      
      // Tạo đối tượng params
      const params: Record<string, any> = {
        page,
        limit,
        postId
      }
      
      // Chỉ thêm parentId nếu nó tồn tại
      if (parentId) {
        params.parentId = parentId
      }
      
      // Kiểm tra httpRequest
      if (!httpRequest || typeof httpRequest.get !== 'function') {
        console.error('httpRequest is not valid or get is not a function')
        throw new Error('HTTP client is not properly initialized')
      }
      
      // Gọi API
      const response = await httpRequest.get('/posts/comments', { params })
      
      // Log response để debug
      console.log('Comment API Response:', response)
      
      return response
    } catch (error) {
      console.error('Error in getComments:', error)
      throw error
    }
  }

  // Tạo comment mới
  async createComment(postId: string, data: { content: string; parentId?: string; tempId?: string }) {
    try {
      const response = await httpRequest.post('/posts/comments', {
        postId,
        content: data.content,
        parentId: data.parentId,
        tempId: data.tempId
      })
      return response
    } catch (error) {
      console.error('Error in createComment:', error)
      throw error
    }
  }
  
  // Like/unlike comment
  async likeComment(commentId: string) {
    try {
      const response = await httpRequest.post(`/comments/${commentId}/like`)
      return response
    } catch (error) {
      console.error('Error in likeComment:', error)
      throw error
    }
  }
  
  // Tham gia vào room của bài viết (socket)
  joinPostRoom(socket: Socket, postId: string) {
    if (!socket || !postId) return
    socket.emit('JOIN_POST_ROOM', { postId })
  }
  
  // Rời khỏi room của bài viết (socket)
  leavePostRoom(socket: Socket, postId: string) {
    if (!socket || !postId) return
    socket.emit('LEAVE_POST_ROOM', { postId })
  }
  
  // Tham gia vào room của comment (socket)
  joinCommentRoom(socket: Socket, commentId: string) {
    socket.emit('JOIN_COMMENT_ROOM', { commentId })
  }
  
  // Rời khỏi room của comment (socket)
  leaveCommentRoom(socket: Socket, commentId: string) {
    socket.emit('LEAVE_COMMENT_ROOM', { commentId })
  }
}

export default new CommentService()








