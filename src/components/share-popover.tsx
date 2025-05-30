'use client'

import { Check, Copy, Share } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ReactNode, useState } from 'react'
import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TelegramIcon,
  TelegramShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton
} from 'react-share'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import postService from '~/services/post.service'

type Props = {
  title?: string
  children: ReactNode
  postId: string
  post: any
}

function SharePopover({ children, title, postId, post }: Props) {
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const { data: session } = useSession()

  const shareUrl = `${window.location.origin}/posts/${postId}`

  // Kiểm tra xem bài viết có phải của chính mình không
  const isMyPost = post?.userId?._id === session?.user?._id || post?.user_id?._id === session?.user?._id

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Đã sao chép liên kết')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Không thể sao chép liên kết')
    }
  }

  // Thêm hàm chia sẻ lên tường
  const handleShareToWall = async () => {
    if (!session?.user) {
      toast.error('Bạn cần đăng nhập để thực hiện chức năng này')
      return
    }

    try {
      setIsSharing(true)
      // Gọi API để chia sẻ bài viết lên tường
      await postService.sharePost(postId)
      toast.success('Đã chia sẻ bài viết lên tường của bạn')
    } catch (error) {
      toast.error('Không thể chia sẻ bài viết')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className='w-auto p-4' side='top' align='center'>
        <div className='space-y-4'>
          <h3 className='text-center font-medium'>Chia sẻ bài viết</h3>

          {/* Share to wall button - chỉ hiển thị khi không phải bài viết của mình */}
          {session?.user && !isMyPost && (
            <Button
              variant='default'
              size='sm'
              onClick={handleShareToWall}
              className='flex w-full items-center justify-center gap-2'
              disabled={isSharing}
            >
              <Share className='h-4 w-4' />
              {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ lên tường của bạn'}
            </Button>
          )}

          {/* Copy link button */}
          <div className='flex items-center space-x-2'>
            <div className='bg-muted w-full max-w-[250px] flex-1 truncate rounded-md p-2 text-xs'>{shareUrl}</div>
            <Button variant='outline' size='sm' onClick={handleCopyLink} className='flex items-center gap-1'>
              {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </Button>
          </div>

          {/* Social share buttons */}
          <div className='flex flex-wrap justify-center gap-2'>
            <FacebookShareButton url={shareUrl} title={title}>
              <FacebookIcon size={40} round />
            </FacebookShareButton>

            <TwitterShareButton url={shareUrl} title={title}>
              <TwitterIcon size={40} round />
            </TwitterShareButton>

            <TelegramShareButton url={shareUrl} title={title}>
              <TelegramIcon size={40} round />
            </TelegramShareButton>

            <WhatsappShareButton url={shareUrl} title={title}>
              <WhatsappIcon size={40} round />
            </WhatsappShareButton>

            <LinkedinShareButton url={shareUrl} title={title}>
              <LinkedinIcon size={40} round />
            </LinkedinShareButton>

            <EmailShareButton url={shareUrl} subject={title || 'Chia sẻ bài viết'}>
              <EmailIcon size={40} round />
            </EmailShareButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default SharePopover
