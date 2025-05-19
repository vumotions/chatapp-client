import httpRequest from '~/config/http-request'

class PostService {
  getPosts(page = 1, limit = 10) {
    return httpRequest.get(`/posts/get-posts`, {
      params: {
        page,
        limit
      }
    })
  }

  getPostById(id: string) {
    if (!id) {
      console.error('Invalid id for getPostById:', id)
      return Promise.reject(new Error('Invalid id'))
    }
    return httpRequest.get(`/posts/${id}`)
  }

  createPost(formData: FormData) {
    return httpRequest.post('/posts/create-post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async updatePost(id: string, formData: FormData) {
    return httpRequest.put(`/posts/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async deletePost(id: string) {
    return httpRequest.delete(`/posts/${id}`)
  }

  likePost(postId: string) {
    return httpRequest.post('/posts/like', { postId })
  }

  unlikePost(postId: string) {
    return httpRequest.delete(`/posts/like/${postId}`)
  }

  sharePost(postId: string) {
    if (!postId) {
      console.error('Invalid postId for sharePost:', postId)
      return Promise.reject(new Error('Invalid postId'))
    }

    return httpRequest.post('/posts/share', { postId })
  }

  async getComments(postId: string, page = 1, limit = 10) {
    return httpRequest.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`)
  }

  async createComment(postId: string, content: string) {
    return httpRequest.post(`/posts/${postId}/comments`, { content })
  }

  async deleteComment(postId: string, commentId: string) {
    return httpRequest.delete(`/posts/${postId}/comments/${commentId}`)
  }

  getUserPosts(userId: string, page = 1, limit = 5) {
    return httpRequest.get(`/posts/user/${userId}`, {
      params: {
        page,
        limit
      }
    })
  }
}
const postService = new PostService()
export default postService
