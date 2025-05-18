import httpRequest from '~/config/http-request'
import { SuccessResponse } from '~/types/api.types'
import { TParams } from '~/types/parma.types'
import { createParams } from '~/utils/param.utils'

export interface Post {
  _id: string
  userId: string
  content: string
  images?: string[]
  likes: number
  comments: number
  shares: number
  createdAt: string
  updatedAt: string
  user: {
    _id: string
    name: string
    avatar: string
  }
}

interface PostsResponse {
  posts: Post[]
  hasMore: boolean
  totalPages: number
  currentPage: number
}

class PostService {
  getPostsByUserId() {
    return httpRequest.get<SuccessResponse<PostsResponse>>(`/posts/get-user-Post`)
  }
  getPosts(params: TParams) {
    const queryParams = createParams(params)
    return httpRequest.get<SuccessResponse<PostsResponse>>(`/posts/get-posts`, { params: queryParams })
  }

  createPost(formData: FormData) {
    return httpRequest.post<SuccessResponse<FormData>>('/posts/create-post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
  updatePost(postId: string, content: string, images?: string[]) {
    return httpRequest.put<SuccessResponse<Post>>(`/posts/${postId}`, {
      content,
      images
    })
  }

  deletePost(postId: string) {
    return httpRequest.delete<SuccessResponse<null>>(`/posts/${postId}`)
  }

  likePost(postId: string) {
    return httpRequest.post<SuccessResponse<null>>(`/posts/${postId}/like`)
  }

  unlikePost(postId: string) {
    return httpRequest.delete<SuccessResponse<null>>(`/posts/${postId}/like`)
  }
}

const postService = new PostService()
export default postService
