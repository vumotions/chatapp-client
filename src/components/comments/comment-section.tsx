'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

import { useSocket } from '~/hooks/use-socket'
import commentService from '~/services/comment.service'
import { Comment } from '~/types/comment'
import CommentItem from './comment-item'

interface CommentSectionProps {
  postId: string
  onCommentCountChange?: React.Dispatch<React.SetStateAction<number>>
}

export default function CommentSection({ postId, onCommentCountChange }: CommentSectionProps) {
  const { data: session } = useSession()
  const [commentText, setCommentText] = useState('')
  const [localComments, setLocalComments] = useState<Comment[]>([]) // Khởi tạo là mảng rỗng
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false
  })
  const { socket } = useSocket()

  // Thêm state để theo dõi việc tạm thời tắt socket
  const [disableSocket, setDisableSocket] = useState(false)

  // Cập nhật số lượng comment khi pagination.total thay đổi
  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(pagination.total)
    }
  }, [pagination.total, onCommentCountChange])

  // Fetch comments khi component mount
  useEffect(() => {
    if (!postId) return
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  // Xử lý socket events
  useEffect(() => {
    if (!socket || !postId || disableSocket) return

    // Kiểm tra socket có phải là đối tượng hợp lệ không
    if (socket && typeof socket.emit === 'function') {
      // Tham gia vào room của bài viết
      commentService.joinPostRoom(socket, postId)
      console.log(`Joined post room: ${postId}`)

      // Lắng nghe sự kiện NEW_COMMENT
      const handleNewComment = (data: any) => {
        console.log('Received NEW_COMMENT event:', data)
        // Nếu là reply thì không xử lý ở đây
        if (data.isReply) return

        // Thêm comment mới vào đầu mảng
        setLocalComments((prev) => {
          // Kiểm tra trùng lặp
          const isDuplicate = prev.some(
            (comment) => comment._id === data.comment._id || (comment.tempId && comment.tempId === data.comment.tempId)
          )

          if (isDuplicate) {
            console.log('Duplicate comment detected, not adding to state')
            return prev
          }

          console.log('Adding new comment to state:', data.comment)
          return [data.comment, ...prev]
        })

        // Cập nhật tổng số comment
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1
        }))
      }

      if (typeof socket.on === 'function') {
        socket.on('NEW_COMMENT', handleNewComment)

        return () => {
          // Hủy đăng ký sự kiện khi component unmount
          if (socket && typeof socket.off === 'function') {
            socket.off('NEW_COMMENT', handleNewComment)
            commentService.leavePostRoom(socket, postId)
          }
        }
      }
    }

    return undefined
  }, [socket, postId, disableSocket])

  const fetchComments = async () => {
    if (isLoading) return

    try {
      setIsLoading(true)
      const response = await commentService.getComments(postId, pagination.page, pagination.limit)

      // Kiểm tra cấu trúc dữ liệu trả về
      console.log('API Response:', response)

      // Xử lý dữ liệu trả về
      const data = response.data.data || []
      const paginationData = response.data.pagination || {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        hasMore: false
      }

      // Nếu là trang đầu tiên, thay thế toàn bộ comments
      // Nếu không, thêm vào danh sách hiện tại
      if (pagination.page === 1) {
        setLocalComments(Array.isArray(data) ? data : [])
      } else {
        setLocalComments((prev) => [...prev, ...(Array.isArray(data) ? data : [])])
      }

      setPagination(paginationData)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      toast.error('Không thể tải bình luận')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreComments = () => {
    if (pagination.hasMore && !isLoading) {
      setPagination((prev) => ({
        ...prev,
        page: prev.page + 1
      }))
      fetchComments()
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)

      // Tạm thời tắt socket để tránh nhận sự kiện của chính mình
      setDisableSocket(true)

      // Tạo tempId để theo dõi comment
      const tempId = `temp-${Date.now()}`

      // Lưu nội dung comment trước khi xóa
      const commentContent = commentText

      // Xóa nội dung trong textarea
      setCommentText('')

      // Tạo comment tạm thời để hiển thị ngay lập tức
      const tempComment: Comment = {
        _id: tempId, // Sử dụng tempId làm _id tạm thời
        tempId,
        userId: {
          _id: session?.user?.id as string,
          name: session?.user?.name as string,
          avatar: session?.user?.image as string
        },
        postId,
        content: commentContent,
        createdAt: new Date().toISOString(),
        isLocal: true
      }

      // Thêm comment tạm thời vào state
      setLocalComments((prev) => [tempComment, ...prev])

      // Gọi API để lưu comment
      const response = await commentService.createComment(postId, {
        content: commentContent,
        tempId
      })

      // Cập nhật comment tạm thời bằng dữ liệu từ server
      setLocalComments((prev) => {
        return prev.map((comment) => {
          if (comment.tempId === tempId) {
            // Thay thế hoàn toàn comment tạm thời bằng comment từ server
            return response.data.data
          }
          return comment
        })
      })

      // Đợi một chút trước khi bật lại socket
      setTimeout(() => {
        setDisableSocket(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to submit comment:', error)
      toast.error('Không thể gửi bình luận')

      // Xóa comment tạm thời khỏi state
      setLocalComments((prev) => prev.filter((comment) => !comment.isLocal))

      // Bật lại socket
      setDisableSocket(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-4'>
      {/* Comment input */}
      <div className='flex items-start gap-2'>
        <Avatar className='h-8 w-8'>
          <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
          <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <Textarea
            placeholder='Viết bình luận...'
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className='min-h-[60px] resize-none'
          />
          <div className='mt-2 flex justify-end'>
            <Button size='sm' onClick={handleSubmitComment} disabled={!commentText.trim() || isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi'}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className='space-y-4'>
        {localComments.map((comment) => {
          // Tạo key duy nhất cho mỗi comment
          const uniqueKey = comment.isLocal ? `local-${comment.tempId}` : comment._id

          return <CommentItem key={uniqueKey} comment={comment} postId={postId} />
        })}
        {isLoading && <p className='text-muted-foreground text-center'>Đang tải bình luận...</p>}
        {!isLoading && localComments.length === 0 && (
          <p className='text-muted-foreground text-center'>Chưa có bình luận nào</p>
        )}
        {!isLoading && pagination.hasMore && (
          <Button variant='ghost' className='w-full' onClick={loadMoreComments}>
            Xem thêm bình luận
          </Button>
        )}
      </div>
    </div>
  )
}
