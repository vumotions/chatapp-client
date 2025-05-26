import { useInfiniteQuery } from '@tanstack/react-query'
import postService from '~/services/post.service'

export const usePosts = () => {
  return useInfiniteQuery({
    queryKey: ['POSTS'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await postService.getPosts(pageParam, 10)
      return response.data
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
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasMore) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 1,
    ...options
  })
}
