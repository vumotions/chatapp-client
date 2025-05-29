import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import CommentSection from '~/components/comments/comment-section'
import SharePopover from '~/components/share-popover'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import postService from '~/services/post.service'

interface MediaItem {
  _id: string
  url: string
  type: 'image' | 'video'
  public_id?: string
}

interface User {
  _id: string
  name: string
  username: string
  avatar: string
}

interface PostProps {
  post: {
    _id: string
    userId?: User
    user_id?: User
    content?: string
    media?: MediaItem[]
    likesCount?: number
    commentsCount?: number
    isLiked?: boolean
    userLiked?: boolean
    likedUsers?: User[]
    createdAt?: string
    created_at?: string
    updated_at?: string
  }
}

export const Post: React.FC<PostProps> = ({ post }) => {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.userLiked || post.isLiked || false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  // Cập nhật state khi prop thay đổi
  useEffect(() => {
    setLikesCount(post.likesCount || 0);
    setCommentCount(post.commentsCount || 0);
    setLiked(post.userLiked || post.isLiked || false);
  }, [post.likesCount, post.commentsCount, post.userLiked, post.isLiked]);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt || post.created_at || new Date()), {
    addSuffix: true,
    locale: vi
  })

  const handleLike = async () => {
    try {
      if (liked) {
        await postService.unlikePost(post._id)
        setLiked(false)
        setLikesCount((prev) => prev - 1)
      } else {
        await postService.likePost(post._id)
        setLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error liking/unliking post:', error)
      toast.error('Không thể thực hiện hành động này')
    }
  }

  const openLightbox = (index: number) => {
    setCurrentMediaIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (post.media && post.media.length > 0) {
      setCurrentMediaIndex((prev) => (prev + 1) % post.media!.length)
    }
  }

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (post.media && post.media.length > 0) {
      setCurrentMediaIndex((prev) => (prev - 1 + post.media!.length) % post.media!.length)
    }
  }

  // Render media content
  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null

    // Trường hợp 1 ảnh/video
    if (post.media.length === 1) {
      const media = post.media[0]
      return (
        <div className='cursor-pointer overflow-hidden rounded-md' onClick={() => openLightbox(0)}>
          {media.type === 'video' ? (
            <video src={media.url} className='h-auto w-full' controls />
          ) : (
            <div className='relative h-[300px] w-full'>
              <Image src={media.url} alt='' fill className='object-cover' />
            </div>
          )}
        </div>
      )
    }

    // Trường hợp 2 ảnh/video
    if (post.media.length === 2) {
      return (
        <div className='grid grid-cols-2 gap-1 overflow-hidden rounded-md'>
          {post.media.map((media, index) => (
            <div
              key={media._id}
              className='aspect-square cursor-pointer overflow-hidden'
              onClick={() => openLightbox(index)}
            >
              {media.type === 'video' ? (
                <video src={media.url} className='h-full w-full object-cover' />
              ) : (
                <div className='relative h-[300px] w-full'>
                  <Image src={media.url} alt='' fill className='object-cover' />
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    // Trường hợp 3 ảnh/video
    if (post.media.length === 3) {
      return (
        <div className='overflow-hidden rounded-md'>
          <div className='grid grid-cols-2 gap-1'>
            <div className='aspect-square cursor-pointer overflow-hidden' onClick={() => openLightbox(0)}>
              {post.media[0].type === 'video' ? (
                <video src={post.media[0].url} className='h-full w-full object-cover' />
              ) : (
                <div className='relative h-[300px] w-full'>
                  <Image src={post.media[0].url} alt='' fill className='object-cover' />
                </div>
              )}
            </div>
            <div className='grid grid-rows-2 gap-1'>
              <div className='aspect-square cursor-pointer overflow-hidden' onClick={() => openLightbox(1)}>
                {post.media[1].type === 'video' ? (
                  <video src={post.media[1].url} className='h-full w-full object-cover' />
                ) : (
                  <div className='relative h-[300px] w-full'>
                    <Image src={post.media[1].url} alt='' fill className='object-cover' />
                  </div>
                )}
              </div>
              <div className='aspect-square cursor-pointer overflow-hidden' onClick={() => openLightbox(2)}>
                {post.media[2].type === 'video' ? (
                  <video src={post.media[2].url} className='h-full w-full object-cover' />
                ) : (
                  <div className='relative h-[300px] w-full'>
                    <Image src={post.media[2].url} alt='' fill className='object-cover' />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Trường hợp 4 ảnh/video
    if (post.media.length === 4) {
      return (
        <div className='overflow-hidden rounded-md'>
          <div className='grid grid-cols-2 gap-1'>
            {post.media.map((media, index) => (
              <div
                key={media._id}
                className='aspect-square cursor-pointer overflow-hidden'
                onClick={() => openLightbox(index)}
              >
                {media.type === 'video' ? (
                  <video src={media.url} className='h-full w-full object-cover' />
                ) : (
                  <div className='relative h-[300px] w-full'>
                    <Image src={media.url} alt='' fill className='object-cover' />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Trường hợp 5+ ảnh/video (hiển thị 4 ảnh đầu + số lượng còn lại)
    return (
      <div className='overflow-hidden rounded-md'>
        <div className='grid grid-cols-2 gap-1'>
          {post.media.slice(0, 4).map((item, index) => (
            <div
              key={item._id}
              className='relative aspect-square cursor-pointer overflow-hidden'
              onClick={() => openLightbox(index)}
            >
              {item.type === 'video' ? (
                <video src={item.url} className='h-full w-full object-cover' />
              ) : (
                <div className='relative h-[300px] w-full'>
                  <Image src={item.url} alt='' fill className='object-cover' />
                </div>
              )}
              {index === 3 && post.media && post.media.length > 4 && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-bold text-white'>
                  +{post.media.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render lightbox
  const renderLightbox = () => {
    if (!lightboxOpen || !post.media || post.media.length === 0) return null

    const currentMedia = post.media[currentMediaIndex]

    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/90' onClick={closeLightbox}>
        <button className='absolute top-4 right-4 text-white' onClick={closeLightbox}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='18' y1='6' x2='6' y2='18'></line>
            <line x1='6' y1='6' x2='18' y2='18'></line>
          </svg>
        </button>

        {post.media.length > 1 && (
          <>
            <button
              className='absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white'
              onClick={goToPrevious}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='15 18 9 12 15 6'></polyline>
              </svg>
            </button>
            <button
              className='absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white'
              onClick={goToNext}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='9 18 15 12 9 6'></polyline>
              </svg>
            </button>
          </>
        )}

        <div className='max-h-[80vh] max-w-[80vw]'>
          {currentMedia.type === 'video' ? (
            <video
              src={currentMedia.url}
              className='max-h-[80vh] max-w-[80vw]'
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Image
              src={currentMedia.url}
              alt=''
              width={500}
              height={300}
              className='max-h-[80vh] max-w-[80vw] object-contain'
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>
    )
  }

  // Render danh sách người đã like
  const renderLikedUsers = () => {
    if (!post.likedUsers || post.likedUsers.length === 0) return null

    return (
      <div className='text-muted-foreground mt-1 text-xs'>
        <span>Được thích bởi </span>
        {post.likedUsers.slice(0, 3).map((user, index) => (
          <span key={user._id}>
            {index > 0 && ', '}
            <span className='font-medium'>{user.name}</span>
          </span>
        ))}
        {post.likedUsers.length > 3 && ` và ${post.likesCount! - 3} người khác`}
      </div>
    )
  }

  // Hàm toggle comments với revalidate
  const handleToggleComments = () => {
    setShowComments(!showComments);
    
    // Nếu đang mở comments, revalidate data
    if (!showComments) {
      // Revalidate post data để cập nhật comment count
      queryClient.invalidateQueries({queryKey: ['POST', post._id]});
      queryClient.invalidateQueries({queryKey: ['COMMENTS', post._id]});
      
      // Fetch trực tiếp số lượng comment nếu cần
      postService.getComments(post._id)
        .then(response => {
          if (response?.data?.totalComments !== undefined) {
            setCommentCount(response.data.totalComments);
          }
        })
        .catch(error => console.error('Error fetching comments:', error));
    }
  };

  return (
    <>
      <Card className='mb-4'>
        <CardContent className='space-y-3 px-4 pt-4'>
          {/* Header của bài viết hiện tại */}
          <div className='flex items-center gap-3'>
            <Avatar className='h-10 w-10'>
              <AvatarImage
                src={post?.user_id?.avatar || post?.userId?.avatar}
                alt={post?.user_id?.username || post?.userId?.username || ''}
              />
              <AvatarFallback>{(post?.user_id?.username || post?.userId?.username || '')[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className='font-medium'>{post?.user_id?.name || post?.userId?.name}</p>
              <p className='text-muted-foreground text-xs'>{timeAgo}</p>
            </div>
          </div>

          {/* Nội dung bài viết hiện tại (nếu có) */}
          {post.content && (
            <div>
              <p className='whitespace-pre-line'>{post.content}</p>
            </div>
          )}

          {/* Media của bài viết hiện tại (nếu có) */}
          {renderMedia()}

          {/* Reactions và actions */}
          <div className='text-muted-foreground flex justify-between pt-2 text-xs'>
            <div>{likesCount || 0} lượt thích</div>
            <div>{commentCount || 0} bình luận</div>
          </div>

          {/* Hiển thị danh sách người đã like */}
          {renderLikedUsers()}

          <div className='flex items-center justify-between border-t border-b py-2'>
            <Button variant='ghost' size='sm' className='flex-1' onClick={handleLike}>
              <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              Thích
            </Button>
            <Button variant='ghost' size='sm' className='flex-1' onClick={handleToggleComments}>
              <MessageCircle className='mr-2 h-4 w-4' />
              Bình luận
            </Button>
            <SharePopover postId={post._id}>
              <Button variant='ghost' size='sm' className='flex-1'>
                <Share2 className='mr-2 h-4 w-4' />
                Chia sẻ
              </Button>
            </SharePopover>
          </div>

          {/* Comment section - Thêm prop để cập nhật số lượng comment */}
          {showComments && (
            <CommentSection 
              postId={post._id} 
              onCommentCountChange={(count) => setCommentCount(count)}
            />
          )}
        </CardContent>
      </Card>
      {renderLightbox()}
    </>
  )
}

export default Post
