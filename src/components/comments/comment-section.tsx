import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Smile, Image as ImageIcon, Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '~/lib/utils'
import { toast } from 'sonner'
import httpRequest from '~/config/http-request'

// Thêm service cho comment
const commentService = {
  getComments(postId: string, page = 1, limit = 10) {
    return httpRequest.get(`/posts/comments?postId=${postId}&page=${page}&limit=${limit}`)
  },
  createComment(postId: string, data: { content: string, parentId?: string }) {
    return httpRequest.post('/posts/comments', { postId, ...data })
  }
}

// Cập nhật type Comment
type Comment = {
  _id: string
  content: string
  userId?: string
  user_id: {
    _id: string
    username?: string
    name?: string
    avatar?: string
  }
  created_at: string
  createdAt?: string
  likes?: number
  parentId?: string
  isLocal?: boolean
}

type CommentSectionProps = {
  postId: string
  comments?: Comment[]
}

const CommentSection = forwardRef<HTMLTextAreaElement, CommentSectionProps>(
  ({ postId, comments = [] }, ref) => {
    const { data: session } = useSession()
    const [commentText, setCommentText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [localComments, setLocalComments] = useState<Comment[]>(comments)
    const [isLoading, setIsLoading] = useState(false)
    const commentInputRef = useRef<HTMLTextAreaElement>(null)
    
    // Fetch comments on mount
    useEffect(() => {
      fetchComments()
    }, [postId])
    
    const fetchComments = async () => {
      if (!postId) return
      
      setIsLoading(true)
      try {
        const response = await commentService.getComments(postId)
        setLocalComments(response.data.data || [])
      } catch (error) {
        console.error('Error fetching comments:', error)
        toast.error('Không thể tải bình luận')
      } finally {
        setIsLoading(false)
      }
    }

    const handleCommentSubmit = async () => {
      if (!commentText.trim() || !session?.user) return
      
      setIsSubmitting(true)
      
      try {
        // Thêm comment vào local state trước để UI cập nhật ngay
        const tempComment: Comment = {
          _id: Date.now().toString(),
          content: commentText,
          user_id: {
            _id: session.user.id as string,
            name: session.user.name as string,
            avatar: session.user.image as string
          },
          created_at: new Date().toISOString(),
          isLocal: true
        }
        
        setLocalComments([...localComments, tempComment])
        setCommentText('')
        
        // Gọi API để lưu comment
        const response = await commentService.createComment(postId, { content: commentText })
        
        // Cập nhật lại comment với dữ liệu từ server
        setLocalComments(prev => 
          prev.map(comment => 
            comment.isLocal ? response.data.data : comment
          )
        )
      } catch (error) {
        console.error('Error posting comment:', error)
        toast.error('Không thể đăng bình luận')
        // Rollback nếu có lỗi
        setLocalComments(prev => prev.filter(comment => !comment.isLocal))
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div className="mt-2 space-y-4">
        {/* Comment input */}
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={session?.user?.image || ''} />
            <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          
          <div className="relative flex-1 rounded-lg bg-muted p-1">
            <Textarea
              ref={commentInputRef}
              placeholder="Viết bình luận..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-2 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCommentSubmit()
                }
              }}
            />
            
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
              
              <Button 
                size="icon" 
                className={cn("h-8 w-8 rounded-full", !commentText.trim() && "opacity-50")}
                disabled={!commentText.trim() || isSubmitting}
                onClick={handleCommentSubmit}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Comments list */}
        {localComments.length > 0 && (
          <div className="space-y-3 pl-10">
            {localComments.map((comment) => (
              <CommentItem key={comment._id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    )
  }
)

CommentSection.displayName = 'CommentSection'

function CommentItem({ comment }: { comment: Comment }) {
  const { data: session } = useSession()
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyCount, setReplyCount] = useState(0)
  
  const timeAgo = formatDistanceToNow(
    new Date(comment.created_at || comment.createdAt || Date.now()), 
    { addSuffix: true, locale: vi }
  )
  
  // Fetch reply count on mount
  useEffect(() => {
    if (comment._id) {
      fetchReplyCount()
    }
  }, [comment._id])
  
  const fetchReplyCount = async () => {
    try {
      const response = await commentService.getComments(
        window.location.pathname.split('/').pop() || '',
        1,
        0,
        comment._id
      )
      setReplyCount(response.data.total || 0)
    } catch (error) {
      console.error('Error fetching reply count:', error)
    }
  }
  
  const handleReplySubmit = async () => {
    if (!replyText.trim() || !session?.user) return
    
    setIsSubmitting(true)
    try {
      await commentService.createComment(
        window.location.pathname.split('/').pop() || '',
        { 
          content: replyText,
          parentId: comment._id 
        }
      )
      
      setReplyText('')
      setShowReplyInput(false)
      setReplyCount(prev => prev + 1)
      toast.success('Đã trả lời bình luận')
    } catch (error) {
      console.error('Error posting reply:', error)
      toast.error('Không thể trả lời bình luận')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="group relative">
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user_id.avatar || ''} />
          <AvatarFallback>{comment.user_id.username?.[0] || comment.user_id.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="bg-muted rounded-lg px-3 py-2">
            <div className="font-medium text-sm mb-1">
              {comment.user_id.username || comment.user_id.name}
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-muted-foreground">{timeAgo}</span>
            <Button variant="link" className="h-auto p-0 text-xs">Thích</Button>
            <Button 
              variant="link" 
              className="h-auto p-0 text-xs"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Trả lời
            </Button>
            {replyCount > 0 && (
              <Button variant="link" className="h-auto p-0 text-xs">
                {replyCount} phản hồi
              </Button>
            )}
          </div>
          
          {showReplyInput && (
            <div className="mt-2 flex items-start gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={session?.user?.image || ''} />
                <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              
              <div className="relative flex-1 rounded-lg bg-muted p-1">
                <Textarea
                  placeholder={`Trả lời ${comment.user_id.username || comment.user_id.name}...`}
                  className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleReplySubmit()
                    }
                  }}
                />
                
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                      <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  
                  <Button 
                    size="icon" 
                    className={cn("h-6 w-6 rounded-full", !replyText.trim() && "opacity-50")}
                    disabled={!replyText.trim() || isSubmitting}
                    onClick={handleReplySubmit}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommentSection




