import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useRouter } from '~/i18n/navigation'
import postService from '~/services/post.service'

export const usePosts = () => {
  return useInfiniteQuery({
    queryKey: ['POSTS'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await postService.getPosts(pageParam, 10)
      return response.data.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.hasMore) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    staleTime: 1000 * 60 * 5, // 5 phút
    refetchOnWindowFocus: false
  })
}

export const useUserPosts = (userId: string, options = {}) => {
  return useInfiniteQuery({
    queryKey: ['USER_POSTS', userId],
    queryFn: async ({ pageParam = 1 }) => {
      // Nếu không có userId, trả về dữ liệu trống
      if (!userId) {
        return {
          posts: [],
          currentPage: 1,
          hasMore: false
        }
      }

      try {
        const response = await postService.getUserPosts(userId, pageParam, 5)
        // Đảm bảo dữ liệu trả về có cấu trúc đúng
        return {
          posts: response.data?.data?.posts || [],
          currentPage: response.data?.data?.currentPage || pageParam,
          hasMore: response.data?.data?.hasMore || false
        }
      } catch (error) {
        console.error('Error fetching user posts:', error)
        return {
          posts: [],
          currentPage: pageParam,
          hasMore: false
        }
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.hasMore) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    ...options
  })
}

// Hook để xóa bài viết
export const useDeletePostMutation = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: () => {
      // Invalidate tất cả các query liên quan đến bài viết
      queryClient.invalidateQueries({ queryKey: ['POSTS'] })

      // Invalidate danh sách bài viết của người dùng hiện tại
      if (session?.user?._id) {
        queryClient.invalidateQueries({ queryKey: ['USER_POSTS', session.user._id] })
      }

      // Hiển thị thông báo thành công
      toast.success('Đã xóa bài viết thành công')

      // Chuyển hướng về trang chủ nếu đang ở trang chi tiết bài viết
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname
        if (pathname.includes('/posts/')) {
          if (router) {
            router.push('/')
          } else {
            window.location.href = '/'
          }
        }
      }
    },
    onError: (error: any) => {
      console.error('Error deleting post:', error)
      toast.error(error?.response?.data?.message || 'Không thể xóa bài viết')
    }
  })
}
