import React, { useState, useRef } from 'react'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import SharePopover from '~/components/share-popover'
import CommentSection from '~/components/comments/comment-section'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import postService from '~/services/post.service'

export const Post = ({ post }) => {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  
  const timeAgo = formatDistanceToNow(new Date(post.createdAt || post.created_at), {
    addSuffix: true,
    locale: vi
  })

  const handleLike = async () => {
    try {
      if (liked) {
        await postService.unlikePost(post._id)
        setLiked(false)
        setLikesCount(prev => prev - 1)
      } else {
        await postService.likePost(post._id)
        setLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error liking/unliking post:', error)
      toast.error('Không thể thực hiện hành động này')
    }
  }

  const openLightbox = (index) => {
    setCurrentMediaIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const goToNext = (e) => {
    e.stopPropagation()
    setCurrentMediaIndex((prev) => (prev + 1) % post.media.length)
  }

  const goToPrevious = (e) => {
    e.stopPropagation()
    setCurrentMediaIndex((prev) => (prev - 1 + post.media.length) % post.media.length)
  }

  // Render media content
  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;
    
    // Trường hợp 1 ảnh/video
    if (post.media.length === 1) {
      const media = post.media[0];
      return (
        <div className="overflow-hidden rounded-md cursor-pointer" onClick={() => openLightbox(0)}>
          {media.type === "video" ? (
            <video src={media.url} className="w-full h-auto" controls />
          ) : (
            <img src={media.url} alt="" className="w-full h-auto" />
          )}
        </div>
      );
    }
    
    // Trường hợp 2 ảnh/video
    if (post.media.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-md">
          {post.media.map((media, index) => (
            <div key={media._id} className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(index)}>
              {media.type === "video" ? (
                <video src={media.url} className="h-full w-full object-cover" />
              ) : (
                <img src={media.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Trường hợp 3 ảnh/video
    if (post.media.length === 3) {
      return (
        <div className="overflow-hidden rounded-md">
          <div className="grid grid-cols-2 gap-1">
            <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(0)}>
              {post.media[0].type === "video" ? (
                <video src={post.media[0].url} className="h-full w-full object-cover" />
              ) : (
                <img src={post.media[0].url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="grid grid-rows-2 gap-1">
              <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(1)}>
                {post.media[1].type === "video" ? (
                  <video src={post.media[1].url} className="h-full w-full object-cover" />
                ) : (
                  <img src={post.media[1].url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(2)}>
                {post.media[2].type === "video" ? (
                  <video src={post.media[2].url} className="h-full w-full object-cover" />
                ) : (
                  <img src={post.media[2].url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Trường hợp 4 ảnh/video
    if (post.media.length === 4) {
      return (
        <div className="overflow-hidden rounded-md">
          <div className="grid grid-cols-2 gap-1">
            {post.media.map((media, index) => (
              <div key={media._id} className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(index)}>
                {media.type === "video" ? (
                  <video src={media.url} className="h-full w-full object-cover" />
                ) : (
                  <img src={media.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Trường hợp 5+ ảnh/video (hiển thị 4 ảnh đầu + số lượng còn lại)
    return (
      <div className="overflow-hidden rounded-md">
        <div className="grid grid-cols-2 gap-1">
          {post.media.slice(0, 4).map((item, index) => (
            <div key={item._id} className="aspect-square overflow-hidden relative cursor-pointer" onClick={() => openLightbox(index)}>
              {item.type === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              {index === 3 && post.media.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-2xl">
                  +{post.media.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render lightbox
  const renderLightbox = () => {
    if (!lightboxOpen || !post.media || post.media.length === 0) return null;
    
    const currentMedia = post.media[currentMediaIndex];
    
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={closeLightbox}
      >
        <button 
          className="absolute right-4 top-4 text-white"
          onClick={closeLightbox}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="max-h-[90vh] max-w-[90vw] relative" onClick={(e) => e.stopPropagation()}>
          {currentMedia.type === "video" ? (
            <video 
              src={currentMedia.url} 
              controls 
              autoPlay
              className="max-h-[90vh] max-w-[90vw] object-contain" 
            />
          ) : (
            <img 
              src={currentMedia.url} 
              alt="" 
              className="max-h-[90vh] max-w-[90vw] object-contain" 
            />
          )}
        </div>
        
        {post.media.length > 1 && (
          <>
            <button 
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
              onClick={goToPrevious}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
              onClick={goToNext}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="space-y-3 px-4 pt-4">
          {/* Header của bài viết hiện tại */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post?.user_id?.avatar || post?.userId?.avatar} alt={post?.user_id?.username || post?.userId?.username} />
              <AvatarFallback>{(post?.user_id?.username || post?.userId?.username)?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post?.user_id?.name || post?.userId?.name}</p>
              <p className="text-muted-foreground text-xs">{timeAgo}</p>
            </div>
          </div>
          
          {/* Nội dung bài viết hiện tại (nếu có) */}
          {post.content && (
            <div>
              <p className="whitespace-pre-line">{post.content}</p>
            </div>
          )}
          
          {/* Media của bài viết hiện tại (nếu có) */}
          {renderMedia()}
          
          {/* Reactions và actions */}
          <div className="text-muted-foreground flex justify-between pt-2 text-xs">
            <div>{likesCount || 0} lượt thích</div>
            <div>{commentCount || 0} bình luận</div>
          </div>
          
          <div className="flex items-center justify-between border-t border-b py-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={handleLike}>
              <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              Thích
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Bình luận
            </Button>
            <SharePopover postId={post._id}>
              <Button variant="ghost" size="sm" className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Chia sẻ
              </Button>
            </SharePopover>
          </div>
          
          {/* Comment section */}
          {showComments && (
            <CommentSection 
              postId={post._id} 
              onCommentCountChange={setCommentCount}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Lightbox for media */}
      {renderLightbox()}
    </>
  )
}
