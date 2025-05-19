'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, MessageSquareReply } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { useSocket } from '~/providers/socket-provider'
import commentService from '~/services/comment.service'
import { Comment } from '~/types/comment'

interface CommentItemProps {
  comment: Comment
  postId: string
}

export default function CommentItem({ comment, postId }: CommentItemProps) {
  const { data: session } = useSession()
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<Comment[]>([]) // Khởi tạo là mảng rỗng
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const [replyCount, setReplyCount] = useState(0)
  const [isLiked, setIsLiked] = useState(comment.userLiked || false)
  const [likeCount, setLikeCount] = useState(comment.likesCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const { socket } = useSocket()
  // Thêm state để theo dõi việc tạm thời tắt socket
  const [disableSocket, setDisableSocket] = useState(false)
  // Thêm state để theo dõi các reply đã được xử lý
  const [processedReplyIds, setProcessedReplyIds] = useState<Set<string>>(new Set())

  // Thêm useEffect để tải số lượng phản hồi khi component mount
  useEffect(() => {
    if (comment._id) {
      fetchReplyCount();
    }
  }, [comment._id]);

  // Hàm để tải số lượng phản hồi
  const fetchReplyCount = async () => {
    if (!comment._id || !postId) return;
    
    try {
      const response = await commentService.getComments(postId, 1, 0, comment._id);
      console.log('Reply count response:', response);
      
      let total = 0;
      
      // Xử lý các cấu trúc dữ liệu có thể có
      if (response.data && response.data.pagination && typeof response.data.pagination.total === 'number') {
        total = response.data.pagination.total;
      } else if (response.data && response.data.data) {
        if (Array.isArray(response.data.data)) {
          total = response.data.data.length;
        } else if (response.data.data.comments && Array.isArray(response.data.data.comments)) {
          total = response.data.data.comments.length;
        }
      }
      
      console.log('Calculated reply count:', total);
      setReplyCount(total);
    } catch (error) {
      console.error('Failed to fetch reply count:', error);
    }
  };

  // Xử lý socket events
  useEffect(() => {
    if (!socket || !comment._id || disableSocket) return

    // Tham gia vào room của comment
    commentService.joinCommentRoom(socket, comment._id)
    console.log(`Joined comment room: ${comment._id}`)

    // Lắng nghe sự kiện NEW_REPLY
    const handleNewReply = (data: { comment: Comment, parentId: string, creatorId: string }) => {
      console.log('Received NEW_REPLY event:', data)
      
      // Kiểm tra xem reply này có phải cho comment hiện tại không
      if (data.parentId !== comment._id) return
      
      // Nếu reply này được tạo bởi người dùng hiện tại, bỏ qua
      if (data.creatorId === session?.user?.id) {
        console.log('Reply created by current user, ignoring socket event')
        return
      }
      
      // Thêm reply mới vào state
      setReplies(prev => {
        // Kiểm tra trùng lặp
        const isDuplicate = prev.some(reply => 
          reply._id === data.comment._id || 
          (reply.tempId && reply.tempId === data.comment.tempId)
        )
        
        if (isDuplicate) {
          console.log('Duplicate reply detected, not adding to state')
          return prev
        }
        
        console.log('Adding new reply to state:', data.comment)
        return [data.comment, ...prev]
      })
      
      // Cập nhật số lượng reply
      setReplyCount(prev => prev + 1)
      
      // Đảm bảo replies được hiển thị
      if (!showReplies) {
        setShowReplies(true)
      }
    }

    socket.on('NEW_REPLY', handleNewReply)

    return () => {
      // Hủy đăng ký sự kiện khi component unmount
      socket.off('NEW_REPLY', handleNewReply)
      commentService.leaveCommentRoom(socket, comment._id)
    }
  }, [socket, comment._id, session?.user?.id, disableSocket, showReplies])

  // Cập nhật fetchReplies để xử lý đúng cấu trúc dữ liệu
  const fetchReplies = async () => {
    if (isLoadingReplies || !comment._id) return;
    
    try {
      setIsLoadingReplies(true);
      const response = await commentService.getComments(postId, 1, 10, comment._id);
      
      // Kiểm tra cấu trúc dữ liệu trả về
      console.log('Replies API Response:', response);
      
      if (response.data) {
        // Kiểm tra cấu trúc dữ liệu và xử lý phù hợp
        let repliesData = [];
        let paginationData = { total: 0 };
        
        // Kiểm tra các cấu trúc dữ liệu có thể có
        if (response.data.data && Array.isArray(response.data.data)) {
          // Trường hợp data là mảng trực tiếp
          repliesData = response.data.data;
          paginationData = response.data.pagination || { total: repliesData.length };
        } else if (response.data.data && response.data.data.comments) {
          // Trường hợp data.comments là mảng
          repliesData = response.data.data.comments;
          paginationData = response.data.pagination || { total: repliesData.length };
        } else if (Array.isArray(response.data)) {
          // Trường hợp response.data là mảng trực tiếp
          repliesData = response.data;
          paginationData = { total: repliesData.length };
        }
        
        console.log('Processed replies data:', repliesData);
        console.log('Pagination data:', paginationData);
        
        // Cập nhật state với dữ liệu đã xử lý
        setReplies(repliesData);
        setReplyCount(paginationData.total || repliesData.length);
      } else {
        setReplies([]);
        setReplyCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error);
      toast.error('Không thể tải phản hồi');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies && replies.length === 0) {
      fetchReplies();
    }
    setShowReplies(!showReplies);
  };

  const handleLikeComment = async () => {
    if (isLiking || !comment._id) return
    
    try {
      setIsLiking(true)
      
      // Cập nhật UI ngay lập tức để phản hồi nhanh
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
      
      // Gọi API để like/unlike comment
      if (isLiked) {
        await commentService.unlikeComment(comment._id)
      } else {
        await commentService.likeComment(comment._id)
      }
    } catch (error) {
      console.error('Failed to like/unlike comment:', error)
      toast.error('Không thể thích/bỏ thích bình luận')
      
      // Khôi phục trạng thái nếu có lỗi
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
    } finally {
      setIsLiking(false)
    }
  }

  // Cập nhật handleSubmitReply để tạm thời tắt socket
  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmitting) return
    
    try {
      setIsSubmitting(true)
      
      // Tạm thời tắt socket để tránh nhận sự kiện của chính mình
      setDisableSocket(true)
      
      // Tạo tempId để theo dõi reply
      const tempId = `temp-reply-${Date.now()}`
      
      // Lưu nội dung reply trước khi xóa
      const replyContent = replyText
      
      // Xóa nội dung trong textarea
      setReplyText('')
      setShowReplyInput(false)
      
      // Đảm bảo replies được hiển thị
      if (!showReplies) {
        setShowReplies(true)
      }
      
      // Tạo reply tạm thời để hiển thị ngay lập tức
      const tempReply: Comment = {
        _id: tempId, // Sử dụng tempId làm _id tạm thời
        tempId,
        userId: {
          _id: session?.user?.id as string,
          name: session?.user?.name as string,
          avatar: session?.user?.image as string
        },
        postId,
        content: replyContent,
        parentId: comment._id,
        createdAt: new Date().toISOString(),
        isLocal: true
      }
      
      // Thêm reply tạm thời vào state
      setReplies(prev => [tempReply, ...prev])
      setReplyCount(prev => prev + 1)
      
      // Gọi API để lưu reply
      const response = await commentService.createComment(postId, { 
        content: replyContent,
        parentId: comment._id,
        tempId 
      })
      
      // Lấy reply ID từ response
      const replyId = response.data.data._id
      
      // Đánh dấu reply đã được xử lý để tránh duplicate từ socket
      setProcessedReplyIds(prev => new Set(prev).add(replyId))
      
      // Cập nhật reply tạm thời bằng dữ liệu từ server
      setReplies(prev => {
        return prev.map(reply => {
          if (reply.tempId === tempId) {
            // Thay thế hoàn toàn reply tạm thời bằng reply từ server
            return response.data.data
          }
          return reply
        })
      })
      
      // Đợi một chút trước khi bật lại socket
      setTimeout(() => {
        setDisableSocket(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to submit reply:', error)
      toast.error('Không thể gửi phản hồi')
      
      // Xóa reply tạm thời khỏi state
      setReplies(prev => prev.filter(reply => !reply.isLocal))
      setReplyCount(prev => prev - 1)
      
      // Bật lại socket
      setDisableSocket(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Main comment */}
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.userId.avatar} alt={comment.userId.name} />
          <AvatarFallback>{comment.userId.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="rounded-lg bg-muted p-3">
            <div className="font-medium">{comment.userId.name}</div>
            <p>{comment.content}</p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs font-medium flex items-center gap-1"
              onClick={handleLikeComment}
              disabled={isLiking}
            >
              <Heart
                className={`h-3 w-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
              />
              {likeCount > 0 && <span>{likeCount}</span>}
            </Button>
            <span>
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: vi
              })}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs font-medium"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Phản hồi
            </Button>
            {replyCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs font-medium flex items-center gap-1"
                onClick={toggleReplies}
              >
                <MessageSquareReply className="h-3 w-3" />
                {showReplies ? 'Ẩn phản hồi' : `${replyCount} phản hồi`}
              </Button>
            )}
          </div>
          
          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2 flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Viết phản hồi..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[40px] resize-none text-sm"
                />
                <div className="mt-1 flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowReplyInput(false)}
                  >
                    Hủy
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Replies */}
      {showReplies && (
        <div className="ml-10 space-y-2">
          {isLoadingReplies ? (
            <p className="text-sm text-muted-foreground">Đang tải phản hồi...</p>
          ) : (
            Array.isArray(replies) && replies.length > 0 ? (
              replies.map((reply) => (
                <div 
                  key={reply.isLocal ? `local-${reply.tempId}` : reply._id} 
                  className="flex items-start gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage 
                      src={reply.userId?.avatar || reply.avatar || ''} 
                      alt={reply.userId?.name || reply.name || 'User'} 
                    />
                    <AvatarFallback>
                      {(reply.userId?.name || reply.name || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="rounded-lg bg-muted p-2">
                      <div className="text-sm font-medium">
                        {reply.userId?.name || reply.name || 'User'}
                      </div>
                      <p className="text-sm">{reply.content}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs font-medium flex items-center gap-1"
                        onClick={() => {/* Xử lý like reply */}}
                      >
                        <Heart className="h-3 w-3" />
                        {(reply.likesCount || 0) > 0 && <span>{reply.likesCount}</span>}
                      </Button>
                      <span>
                        {formatDistanceToNow(new Date(reply.createdAt), {
                          addSuffix: true,
                          locale: vi
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có phản hồi nào</p>
            )
          )}
        </div>
      )}
    </div>
  )
}





















