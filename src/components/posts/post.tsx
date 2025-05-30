import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, MessageCircle, Share2, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'
import CommentSection from '~/components/comments/comment-section'
import SharePopover from '~/components/share-popover'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { FRIEND_REQUEST_STATUS } from '~/constants/enums'
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useFriendStatus,
  useRemoveFriendMutation,
  useSendFriendRequestMutation
} from '~/hooks/data/friends.hook'
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
    shared_post_data: any
  }
}

export const Post: React.FC<PostProps> = ({ post }) => {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [liked, setLiked] = useState(post.userLiked || post.isLiked || false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Lấy userId của người đăng bài
  const postUserId = post?.user_id?._id || post?.userId?._id
  const currentUserId = session?.user?._id

  // Bỏ qua nếu là bài viết của chính mình
  const isMyPost = postUserId === currentUserId

  // Lấy trạng thái kết bạn
  const {
    data: friendStatus,
    refetch: refetchStatus,
    isLoading: isLoadingFriendStatus
  } = useFriendStatus(postUserId, {
    enabled: !!postUserId && !!currentUserId && !isMyPost
  })

  // Thêm hooks cho shared post ở đây, trước bất kỳ render có điều kiện nào
  const sharedPostUserId = post.shared_post_data?.userId?._id
  const isMySharedPost = sharedPostUserId === currentUserId

  // Sử dụng hook cho shared post
  const {
    data: sharedPostFriendStatus,
    refetch: refetchSharedPostStatus,
    isLoading: isLoadingSharedPostFriendStatus
  } = useFriendStatus(sharedPostUserId, {
    enabled: !!sharedPostUserId && !!currentUserId && !isMySharedPost
  })

  // Các mutation cho hành động kết bạn
  const sendFriendRequest = useSendFriendRequestMutation()
  const cancelFriendRequest = useCancelFriendRequestMutation()
  const acceptFriendRequest = useAcceptFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()

  const timeAgo = formatDistanceToNow(new Date(post.createdAt || post.created_at || new Date()), {
    addSuffix: true,
    locale: vi
  })

  // Hàm xử lý hành động kết bạn với người đăng bài viết được chia sẻ
  const handleSharedPostFriendAction = (e: React.MouseEvent) => {
    e.stopPropagation() // Ngăn chặn sự kiện click lan tỏa lên div cha

    if (!sharedPostUserId || !currentUserId) return

    // Nếu đang là bạn bè, hiển thị dialog xác nhận hủy kết bạn
    if (sharedPostFriendStatus?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
      setShowConfirmDialog(true)
      return
    }

    // Nếu đã gửi lời mời, thực hiện hủy lời mời
    if (sharedPostFriendStatus?.status === FRIEND_REQUEST_STATUS.PENDING) {
      cancelFriendRequest.mutate(sharedPostUserId, {
        onSuccess: () => refetchSharedPostStatus()
      })
      return
    }

    // Nếu đã nhận lời mời, thực hiện chấp nhận lời mời
    if (sharedPostFriendStatus?.status === FRIEND_REQUEST_STATUS.RECEIVED) {
      acceptFriendRequest.mutate(sharedPostUserId, {
        onSuccess: () => refetchSharedPostStatus()
      })
      return
    }

    // Trường hợp gửi lời mời kết bạn mới
    sendFriendRequest.mutate(sharedPostUserId, {
      onSuccess: () => refetchSharedPostStatus()
    })
  }

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
    setShowComments(!showComments)

    // Nếu đang mở comments, revalidate data
    if (!showComments) {
      // Revalidate post data để cập nhật comment count
      queryClient.invalidateQueries({ queryKey: ['POST', post._id] })
      queryClient.invalidateQueries({ queryKey: ['COMMENTS', post._id] })

      // Fetch trực tiếp số lượng comment nếu cần
      postService
        .getComments(post._id)
        .then((response) => {
          if (response?.data?.totalComments !== undefined) {
            setCommentCount(response.data.totalComments)
          }
        })
        .catch((error) => console.error('Error fetching comments:', error))
    }
  }

  // Xử lý hành động kết bạn
  const handleFriendAction = () => {
    if (!postUserId || !currentUserId) return

    // Nếu đang là bạn bè, hiển thị dialog xác nhận hủy kết bạn
    if (friendStatus?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
      setShowConfirmDialog(true)
      return
    }

    // Nếu đã gửi lời mời, thực hiện hủy lời mời
    if (friendStatus?.status === FRIEND_REQUEST_STATUS.PENDING) {
      cancelFriendRequest.mutate(postUserId, {
        onSuccess: () => refetchStatus()
      })
      return
    }

    // Nếu đã nhận lời mời, thực hiện chấp nhận lời mời
    if (friendStatus?.status === FRIEND_REQUEST_STATUS.RECEIVED) {
      acceptFriendRequest.mutate(postUserId, {
        onSuccess: () => refetchStatus()
      })
      return
    }

    // Trường hợp gửi lời mời kết bạn mới
    sendFriendRequest.mutate(postUserId, {
      onSuccess: () => refetchStatus()
    })
  }

  // Xử lý khi xác nhận hủy kết bạn
  const handleConfirmRemoveFriend = () => {
    if (!postUserId) return

    removeFriend.mutate(postUserId, {
      onSuccess: () => {
        refetchStatus()
        setShowConfirmDialog(false)
      }
    })
  }

  // Render nút kết bạn
  const renderFriendButton = () => {
    if (isMyPost || !currentUserId) return null

    // Xác định icon, text và style dựa trên trạng thái
    let icon = <UserPlus className='h-4 w-4' />
    let buttonText = 'Kết bạn'
    let buttonClass = 'bg-primary text-primary-foreground hover:bg-primary/90'

    if (isLoadingFriendStatus) {
      return <div className='bg-muted absolute top-4 right-4 h-9 w-24 animate-pulse rounded-md'></div>
    }

    if (friendStatus?.status === FRIEND_REQUEST_STATUS.PENDING) {
      icon = <UserX className='h-4 w-4' />
      buttonText = 'Hủy lời mời'
      buttonClass = 'bg-muted text-muted-foreground hover:bg-muted/90'
    } else if (friendStatus?.status === FRIEND_REQUEST_STATUS.RECEIVED) {
      icon = <UserCheck className='h-4 w-4' />
      buttonText = 'Chấp nhận'
      buttonClass = 'bg-green-500 text-white hover:bg-green-600'
    } else if (friendStatus?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
      icon = <UserCheck className='h-4 w-4' />
      buttonText = 'Bạn bè'
      buttonClass = 'bg-green-500 text-white hover:bg-green-600'
    }

    const isLoading =
      sendFriendRequest.isPending ||
      cancelFriendRequest.isPending ||
      acceptFriendRequest.isPending ||
      removeFriend.isPending

    return (
      <button
        className={`absolute top-4 right-4 flex h-9 items-center justify-center gap-1.5 rounded-md px-3 ${buttonClass}`}
        onClick={handleFriendAction}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
        ) : (
          <>
            {icon}
            <span className='text-xs font-medium'>{buttonText}</span>
          </>
        )}
      </button>
    )
  }

  // Thêm hàm renderSharedPost vào component Post
  const renderSharedPost = () => {
    if (!post.shared_post_data) return null

    const sharedPost = post.shared_post_data

    // Hàm xử lý khi click vào bài viết được chia sẻ
    const handleSharedPostClick = () => {
      router.push(`/posts/${sharedPost._id}`)
    }

    // Render nút kết bạn cho bài viết được chia sẻ
    const renderSharedPostFriendButton = () => {
      if (isMySharedPost || !currentUserId || !sharedPostUserId) return null

      // Xác định icon, text và style dựa trên trạng thái
      let icon = <UserPlus className='h-3 w-3' />
      let buttonText = 'Kết bạn'
      let buttonClass = 'bg-primary text-primary-foreground hover:bg-primary/90'

      if (isLoadingSharedPostFriendStatus) {
        return <div className='bg-muted absolute top-2 right-2 h-7 w-20 animate-pulse rounded-md'></div>
      }

      if (sharedPostFriendStatus?.status === FRIEND_REQUEST_STATUS.PENDING) {
        icon = <UserX className='h-3 w-3' />
        buttonText = 'Hủy lời mời'
        buttonClass = 'bg-muted text-muted-foreground hover:bg-muted/90'
      } else if (sharedPostFriendStatus?.status === FRIEND_REQUEST_STATUS.RECEIVED) {
        icon = <UserCheck className='h-3 w-3' />
        buttonText = 'Chấp nhận'
        buttonClass = 'bg-green-500 text-white hover:bg-green-600'
      } else if (sharedPostFriendStatus?.status === FRIEND_REQUEST_STATUS.ACCEPTED) {
        icon = <UserCheck className='h-3 w-3' />
        buttonText = 'Bạn bè'
        buttonClass = 'bg-green-500 text-white hover:bg-green-600'
      }

      const isLoading =
        sendFriendRequest.isPending ||
        cancelFriendRequest.isPending ||
        acceptFriendRequest.isPending ||
        removeFriend.isPending

      return (
        <button
          className={`absolute top-2 right-2 flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs ${buttonClass}`}
          onClick={handleSharedPostFriendAction}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
          ) : (
            <>
              {icon}
              <span className='text-xs font-medium'>{buttonText}</span>
            </>
          )}
        </button>
      )
    }

    return (
      <div
        className='bg-muted/30 hover:bg-muted/50 relative mt-3 cursor-pointer rounded-md border p-4 transition-colors'
        onClick={handleSharedPostClick}
      >
        {/* Nút kết bạn - đảm bảo hiển thị */}
        {renderSharedPostFriendButton()}

        <div className='mb-2 flex items-center gap-2'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={sharedPost.userId?.avatar} alt={sharedPost.userId?.name} />
            <AvatarFallback>{sharedPost.userId?.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <p className='text-sm font-medium'>{sharedPost.userId?.name}</p>
            <p className='text-muted-foreground text-xs'>
              {sharedPost.created_at &&
                formatDistanceToNow(new Date(sharedPost.created_at), {
                  addSuffix: true,
                  locale: vi
                })}
            </p>
          </div>
        </div>

        {sharedPost.content && <p className='text-sm whitespace-pre-line'>{sharedPost.content}</p>}

        {sharedPost.media && sharedPost.media.length > 0 && (
          <div className='mt-2'>
            <div className='overflow-hidden rounded-md'>
              {sharedPost.media[0].type === 'video' ? (
                <video src={sharedPost.media[0].url} className='h-auto max-h-[300px] w-full object-cover' controls />
              ) : (
                <div className='relative h-[200px] w-full'>
                  <Image src={sharedPost.media[0].url} alt='' fill className='object-cover' />
                </div>
              )}
              {sharedPost.media.length > 1 && (
                <div className='absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white'>
                  +{sharedPost.media.length - 1}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card className='relative mb-4'>
        <CardContent className='space-y-3 px-4 pt-4'>
          {/* Nút kết bạn */}
          {renderFriendButton()}

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

          {/* Nội dung bài viết được chia sẻ (nếu có) */}
          {renderSharedPost()}

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
            <SharePopover postId={post._id} post={post}>
              <Button variant='ghost' size='sm' className='flex-1'>
                <Share2 className='mr-2 h-4 w-4' />
                Chia sẻ
              </Button>
            </SharePopover>
          </div>

          {/* Comment section - Thêm prop để cập nhật số lượng comment */}
          {showComments && (
            <CommentSection postId={post._id} onCommentCountChange={(count) => setCommentCount(count)} />
          )}
        </CardContent>
      </Card>

      {/* Dialog xác nhận hủy kết bạn */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy kết bạn</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy kết bạn với {post?.user_id?.name || post?.userId?.name}? Hành động này sẽ xóa
              tất cả các kết nối bạn bè giữa hai người.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConfirmDialog(false)}>
              Hủy
            </Button>
            <Button variant='destructive' onClick={handleConfirmRemoveFriend} disabled={removeFriend.isPending}>
              {removeFriend.isPending ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderLightbox()}
    </>
  )
}

export default Post
