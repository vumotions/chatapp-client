import React, { useState, useRef } from 'react'
import { Heart, MessageCircle, Send, LinkIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import Protected from '~/components/protected'
import SharePopover from '~/components/share-popover'
import CommentSection from '~/components/comments/comment-section'
import nextEnv from '~/config/next-env'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function Post({ post }: { post: any }): JSX.Element {
  const createdAt = new Date(post.created_at);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: vi });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Hàm mở lightbox với index của media được click
  const openLightbox = (index: number) => {
    setCurrentMediaIndex(index);
    setLightboxOpen(true);
  };
  
  // Hàm đóng lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
  };
  
  // Hàm chuyển đến ảnh trước
  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev === 0 ? post.media.length - 1 : prev - 1));
  };
  
  // Hàm chuyển đến ảnh tiếp theo
  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev === post.media.length - 1 ? 0 : prev + 1));
  };
  
  // Hàm hiển thị comment và focus vào input
  const toggleComments = () => {
    setShowComments(!showComments);
    
    // Nếu đang mở comments, focus vào input
    if (!showComments) {
      setTimeout(() => {
        if (commentInputRef.current) {
          commentInputRef.current.focus();
        }
      }, 100);
    }
  };
  
  // Hàm tạo lưới hình ảnh theo kiểu Facebook
  const renderMediaGrid = () => {
    if (!post.media || post.media.length === 0) return null;
    
    // Trường hợp 1 ảnh/video
    if (post.media.length === 1) {
      const item = post.media[0];
      if (item.type === "video") {
        return (
          <div className="w-full overflow-hidden rounded-md cursor-pointer" onClick={() => openLightbox(0)}>
            <video 
              src={item.url} 
              controls 
              className="w-full max-h-[500px] object-contain rounded-md"
            />
          </div>
        );
      } else {
        return (
          <div className="w-full overflow-hidden rounded-md cursor-pointer" onClick={() => openLightbox(0)}>
            <img 
              src={item.url} 
              alt="" 
              className="w-full max-h-[500px] object-contain rounded-md" 
            />
          </div>
        );
      }
    }
    
    // Trường hợp 2 ảnh/video
    if (post.media.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-md">
          {post.media.map((item: { url: string; _id: string, type: string }, index: number) => (
            <div key={item._id} className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(index)}>
              {item.type === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Trường hợp 3 ảnh/video
    if (post.media.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-md">
          <div className="row-span-2 aspect-[1/2] overflow-hidden cursor-pointer" onClick={() => openLightbox(0)}>
            {post.media[0].type === "video" ? (
              <video src={post.media[0].url} className="h-full w-full object-cover" />
            ) : (
              <img src={post.media[0].url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
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
      );
    }
    
    // Trường hợp 4 ảnh/video
    if (post.media.length === 4) {
      return (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-md">
          {post.media.map((item: { url: string; _id: string, type: string }, index: number) => (
            <div key={item._id} className="aspect-square overflow-hidden cursor-pointer" onClick={() => openLightbox(index)}>
              {item.type === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Trường hợp 5+ ảnh/video (hiển thị 4 ảnh đầu + số lượng còn lại)
    return (
      <div className="overflow-hidden rounded-md">
        <div className="grid grid-cols-2 gap-1">
          {post.media.slice(0, 4).map((item: { url: string; _id: string, type: string }, index: number) => (
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
        <div className="absolute top-4 left-4 flex items-center gap-2 text-white">
          <button className="rounded-full bg-black/50 p-2" onClick={(e) => { e.stopPropagation(); closeLightbox(); }}>
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post?.user_id?.avatar} alt={post?.user_id?.username} />
              <AvatarFallback>{post?.user_id?.username?.[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{post?.user_id?.username || post?.user_id?.name}</span>
          </div>
        </div>
        
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
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
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
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post?.user_id?.avatar} alt={post?.user_id?.username} />
              <AvatarFallback>{post?.user_id?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post?.user_id?.username || post?.user_id?.name}</p>
              <p className="text-muted-foreground text-xs">{timeAgo}</p>
            </div>
          </div>
          
          <div>
            <p className="whitespace-pre-line">{post.content}</p>
          </div>
          
          {renderMediaGrid()}
          
          <div className="text-muted-foreground flex justify-evenly border-t pt-2 text-sm">
            <Button variant="ghost" size="sm">
              <Heart className="mr-1 h-4 w-4" />
              Thích
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleComments}>
              <MessageCircle className="mr-1 h-4 w-4" />
              Bình luận
            </Button>
            <Protected>
              <Button variant="ghost" size="sm">
                <Send className="mr-1 h-4 w-4" />
                Chia sẻ
              </Button>
            </Protected>
          </div>
          
          {/* Comment Section */}
          {showComments && (
            <CommentSection 
              postId={post._id} 
              comments={post.comments || []} 
              ref={commentInputRef}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Lightbox */}
      {renderLightbox()}
    </>
  )
}
