import { axiosInstance } from '@/lib/axios'

class PostService {
  getPosts(page = 1, limit = 10) {
    return axiosInstance.get(`/posts/get-posts`, {
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
    return axiosInstance.get(`/posts/${id}`)
  }
  
  createPost(formData: FormData) {
    return axiosInstance.post('/posts/create-post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async updatePost(id: string, formData: FormData) {
    return axiosInstance.put(`/posts/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async deletePost(id: string) {
    return axiosInstance.delete(`/posts/${id}`)
  }

  likePost(postId: string) {
    return axiosInstance.post('/posts/like', { postId })
  }
  
  unlikePost(postId: string) {
    return axiosInstance.delete(`/posts/like/${postId}`)
  }
  
  sharePost(postId: string) {
    if (!postId) {
      console.error('Invalid postId for sharePost:', postId)
      return Promise.reject(new Error('Invalid postId'))
    }
    
    return axiosInstance.post('/posts/share', { postId })
  }

  async getComments(postId: string, page = 1, limit = 10) {
    return axiosInstance.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`)
  }

  async createComment(postId: string, content: string) {
    return axiosInstance.post(`/posts/${postId}/comments`, { content })
  }

  async deleteComment(postId: string, commentId: string) {
    return axiosInstance.delete(`/posts/${postId}/comments/${commentId}`)
  }

  getUserPosts(userId: string, page = 1, limit = 5) {
    if (!userId) {
      console.error('Invalid userId for getUserPosts:', userId)
      return Promise.reject(new Error('Invalid userId'))
    }
    
    return axiosInstance.get(`/posts/user/${userId}`, {
      params: {
        page,
        limit
      }
    })
  }
}
const postService = new PostService()
export default postService
