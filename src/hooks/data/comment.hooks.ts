/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import commentService from '~/services/comment.service'
import { Comment } from '~/types/comment'

// Hook để lấy replies của một comment
export const useCommentReplies = (postId: string, commentId: string, enabled = true) => {
  return useQuery({
    queryKey: ['COMMENT_REPLIES', commentId],
    queryFn: async () => {
      const response = await commentService.getComments(postId, 1, 10)

      // Đảm bảo dữ liệu trả về có cấu trúc đúng
      const repliesData = Array.isArray(response.data.data) ? response.data.data : []

      // Thêm thông tin like nếu API không trả về
      const processedReplies = repliesData.map((reply: any) => ({
        ...reply,
        likesCount: reply.likesCount !== undefined ? reply.likesCount : 0,
        userLiked: reply.userLiked !== undefined ? reply.userLiked : false
      }))

      return {
        replies: processedReplies,
        pagination: response.data.pagination || { total: 0 }
      }
    },
    enabled: enabled && !!commentId && !!postId,
    staleTime: 1000 * 60 * 5, // 5 phút
    refetchOnWindowFocus: false
  })
}

// Hook để like/unlike một comment
export const useLikeComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => commentService.likeComment(commentId),
    onMutate: async (commentId) => {
      // Lưu trữ context trước khi update
      const previousData = queryClient.getQueryData(['COMMENT_REPLIES'])

      // Optimistically update replies
      queryClient.setQueryData(['COMMENT_REPLIES'], (old: any) => {
        if (!old) return old

        // Tìm và cập nhật reply
        const updatedReplies = old.replies.map((reply: Comment) => {
          if (reply._id === commentId) {
            const newUserLiked = !reply.userLiked
            return {
              ...reply,
              userLiked: newUserLiked,
              likesCount: newUserLiked ? (reply.likesCount || 0) + 1 : Math.max(0, (reply.likesCount || 0) - 1)
            }
          }
          return reply
        })

        return {
          ...old,
          replies: updatedReplies
        }
      })

      return { previousData }
    },
    onError: (err, commentId, context) => {
      // Khôi phục lại dữ liệu nếu có lỗi
      if (context?.previousData) {
        queryClient.setQueryData(['COMMENT_REPLIES'], context.previousData)
      }
      toast.error('Không thể thích/bỏ thích bình luận')
    },
    onSuccess: (response, commentId) => {
      // Cập nhật cache với dữ liệu mới từ server
      queryClient.invalidateQueries({ queryKey: ['COMMENT_REPLIES', commentId.split('-')[0]] })
    }
  })
}

// Hook để tạo reply cho một comment
// export const useCreateReply = (postId: string) => {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: ({ content, parentId, tempId }: { content: string; parentId: string; tempId?: string }) =>
//       commentService.createComment(postId, { content, parentId, tempId }),
//     onMutate: async ({ content, parentId, tempId }) => {
//       // Lưu trữ context trước khi update
//       const previousData = queryClient.getQueryData(['COMMENT_REPLIES', parentId])

//       // Tạo reply tạm thời
//       const tempReply: Comment = {
//         _id: tempId || `temp-${Date.now()}`,
//         tempId,
//         userId: {
//           _id: '', // Sẽ được cập nhật từ session
//           name: '', // Sẽ được cập nhật từ session
//           avatar: '' // Sẽ được cập nhật từ session
//         },
//         postId,
//         content,
//         parentId,
//         createdAt: new Date().toISOString(),
//         isLocal: true,
//         userLiked: false,
//         likesCount: 0
//       }

//       // Optimistically update replies
//       queryClient.setQueryData(['COMMENT_REPLIES', parentId], (old: any) => {
//         if (!old) return { replies: [tempReply], pagination: { total: 1 } }

//         return {
//           ...old,
//           replies: [tempReply, ...old.replies],
//           pagination: {
//             ...old.pagination,
//             total: old.pagination.total + 1
//           }
//         }
//       })

//       return { previousData, tempReply }
//     },
//     onError: (err, variables, context) => {
//       // Khôi phục lại dữ liệu nếu có lỗi
//       if (context?.previousData) {
//         queryClient.setQueryData(['COMMENT_REPLIES', variables.parentId], context.previousData)
//       }
//       toast.error('Không thể gửi phản hồi')
//     },
//     onSuccess: (response, variables) => {
//       // Cập nhật cache với dữ liệu mới từ server
//       queryClient.invalidateQueries({ queryKey: ['COMMENT_REPLIES', variables.parentId] })
//     }
//   })
// }
export const useCreateCommentMutation = (postId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => commentService.createComment(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['COMMENTS', postId]
      })
      queryClient.invalidateQueries({
        queryKey: ['POSTS']
      })
    }
  })
}

// Hook để cập nhật bình luận
export const useUpdateCommentMutation = (postId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: { content: string } }) =>
      commentService.updateComment(commentId, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['COMMENTS', postId]
      })
      queryClient.invalidateQueries({
        queryKey: ['POSTS']
      })
    }
  })
}

// Hook để xóa bình luận
export const useDeleteCommentMutation = (postId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['COMMENTS', postId]
      })
      queryClient.invalidateQueries({
        queryKey: ['POSTS']
      })
    }
  })
}

// Hook để like/unlike comment
export const useLikeCommentMutation = (postId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => commentService.likeComment(commentId),
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['COMMENTS', postId]
      })
      queryClient.invalidateQueries({
        queryKey: ['POSTS']
      })
    }
  })
}
