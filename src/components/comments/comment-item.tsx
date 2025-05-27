'use client'

import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, Loader2, MessageSquareReply } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

import { useCommentReplies, useCreateReply, useLikeComment } from '~/hooks/data/comment.hooks'
import { useSocket } from '~/hooks/use-socket'
import commentService from '~/services/comment.service'
import { Comment } from '~/types/comment'

interface CommentItemProps {
  comment: Comment
  postId: string
}

export default function CommentItem({ comment, postId }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const { data: session } = useSession()
  const { socket } = useSocket()

  // Sử dụng React Query hooks
  const {
    data: repliesData,
    isLoading: isLoadingReplies,
    refetch: refetchReplies
  } = useCommentReplies(postId, comment._id, showReplies)

  const { mutate: likeComment, isPending: isLiking } = useLikeComment()
  const { mutate: createReply, isPending: isSubmittingReply } = useCreateReply(postId)

  // Lấy dữ liệu từ query
  const replies = repliesData?.replies || []
  const replyCount = repliesData?.pagination?.total || 0

  // Xử lý like comment
  const handleLikeComment = () => {
    if (!comment._id) return
    likeComment(comment._id)
  }

  // Xử lý like reply
  const handleLikeReply = (replyId: string) => {
    if (!replyId) return
    likeComment(replyId)
  }

  // Xử lý hiển thị/ẩn replies
  const toggleReplies = () => {
    setShowReplies(!showReplies)
  }

  // Xử lý gửi reply
  const handleSubmitReply = () => {
    if (!replyText.trim() || isSubmittingReply) return

    const tempId = `temp-reply-${Date.now()}`

    createReply(
      {
        content: replyText,
        parentId: comment._id,
        tempId
      },
      {
        onSuccess: () => {
          setReplyText('')
          setShowReplyInput(false)
          if (!showReplies) {
            setShowReplies(true)
          }
        }
      }
    )
  }

  // Socket effect
  useEffect(() => {
    if (!socket || !comment._id) return

    // Join comment room - đảm bảo socket là một đối tượng hợp lệ
    if (socket && typeof socket.emit === 'function') {
      commentService.joinCommentRoom(socket, comment._id)

      // Cleanup
      return () => {
        if (socket && typeof socket.emit === 'function') {
          commentService.leaveCommentRoom(socket, comment._id)
        }
      }
    }

    return undefined
  }, [socket, comment._id])

  return (
    <div className='space-y-2'>
      {/* Main comment */}
      <div className='flex items-start gap-2'>
        <Avatar className='h-8 w-8'>
          <AvatarImage src={comment.userId?.avatar || ''} alt={comment.userId?.name || ''} />
          <AvatarFallback>{comment.userId?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <div className='bg-muted rounded-lg p-3'>
            <div className='font-medium'>{comment.userId?.name || 'Người dùng'}</div>
            <p>{comment.content}</p>
          </div>
          <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
            <Button
              variant='ghost'
              size='sm'
              className='flex h-auto items-center gap-1 p-0 text-xs font-medium'
              onClick={handleLikeComment}
              disabled={isLiking}
            >
              {comment.userLiked ? (
                <Heart className='h-3 w-3 fill-red-500 text-red-500' />
              ) : (
                <Heart className='h-3 w-3' />
              )}
              {(comment.likesCount ?? 0) > 0 && <span>{comment.likesCount}</span>}
            </Button>
            <span>
              {formatDistanceToNow(new Date(comment.createdAt || Date.now()), {
                addSuffix: true,
                locale: vi
              })}
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='h-auto p-0 text-xs font-medium'
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Phản hồi
            </Button>
            {replyCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='flex h-auto items-center gap-1 p-0 text-xs font-medium'
                onClick={toggleReplies}
              >
                <MessageSquareReply className='h-3 w-3' />
                {showReplies ? 'Ẩn phản hồi' : `${replyCount} phản hồi`}
              </Button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className='mt-2 flex items-start gap-2'>
              <Avatar className='h-6 w-6'>
                <AvatarImage src={session?.user?.avatar || ''} alt={session?.user?.name || ''} />
                <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <Textarea
                  placeholder='Viết phản hồi...'
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className='min-h-[40px] resize-none text-sm'
                />
                <div className='mt-1 flex justify-end gap-2'>
                  <Button size='sm' variant='ghost' onClick={() => setShowReplyInput(false)}>
                    Hủy
                  </Button>
                  <Button size='sm' onClick={handleSubmitReply} disabled={!replyText.trim() || isSubmittingReply}>
                    {isSubmittingReply ? 'Đang gửi...' : 'Gửi'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && (
        <div className='mt-2 space-y-2 pl-8'>
          {isLoadingReplies ? (
            <div className='flex items-center justify-center py-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
            </div>
          ) : replies.length > 0 ? (
            replies.map((reply: any) => (
              <div key={reply._id || reply.tempId} className='flex items-start gap-2'>
                <Avatar className='h-6 w-6'>
                  <AvatarImage src={reply.userId?.avatar || ''} alt={reply.userId?.name || ''} />
                  <AvatarFallback>{reply.userId?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                  <div className='bg-muted rounded-lg p-2'>
                    <div className='text-sm font-medium'>{reply.userId?.name || 'Người dùng'}</div>
                    <p className='text-sm'>{reply.content}</p>
                  </div>
                  <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='flex h-auto items-center gap-1 p-0 text-xs font-medium'
                      onClick={() => handleLikeReply(reply._id)}
                      disabled={isLiking}
                    >
                      {reply.userLiked ? (
                        <Heart className='h-3 w-3 fill-red-500 text-red-500' />
                      ) : (
                        <Heart className='h-3 w-3' />
                      )}
                      {(reply.likesCount ?? 0) > 0 && <span>{reply.likesCount}</span>}
                    </Button>
                    <span>
                      {formatDistanceToNow(new Date(reply.createdAt || Date.now()), {
                        addSuffix: true,
                        locale: vi
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className='text-muted-foreground text-sm'>Chưa có phản hồi nào</p>
          )}
        </div>
      )}
    </div>
  )
}
