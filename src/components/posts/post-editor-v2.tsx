import { useQueryClient } from '@tanstack/react-query'
import { Images, Loader2, Users, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import postService from '~/services/post.service'

interface PostEditorV2Props {
  getPosts?: () => any
  postId?: string
  initialData?: {
    content?: string
    postType?: string
    media?: Array<{
      url: string
      public_id: string
      type: string
    }>
  }
  onSuccess?: () => void
  buttonText?: string
  dialogTitle?: string
  dialogDescription?: string
  isEditMode?: boolean
}

export default function PostEditorV2({
  getPosts,
  postId,
  initialData,
  onSuccess,
  buttonText = 'Post',
  dialogTitle = 'Tạo bài viết mới',
  dialogDescription = 'Chia sẻ suy nghĩ của bạn',
  isEditMode = false
}: PostEditorV2Props) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState(initialData?.content || '')
  const [files, setFiles] = useState<File[]>([])
  const [existingMedia, setExistingMedia] = useState<
    Array<{
      url: string
      public_id: string
      type: string
      isDeleted?: boolean
    }>
  >(initialData?.media || [])
  const [postType, setPostType] = useState(initialData?.postType || 'public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode && !initialData)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Nếu là chế độ chỉnh sửa và không có initialData, tải dữ liệu bài viết
  useEffect(() => {
    if (isEditMode && postId && !initialData) {
      const fetchPostData = async () => {
        try {
          setIsLoading(true)
          const response = await postService.getPostById(postId)
          const post = response.data.data

          setContent(post.content || '')
          setPostType(post.postType || 'public')
          setExistingMedia(post.media || [])
        } catch (error) {
          console.error('Error fetching post data:', error)
          toast.error('Không thể tải dữ liệu bài viết')
        } finally {
          setIsLoading(false)
        }
      }

      fetchPostData()
    }
  }, [isEditMode, postId, initialData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prevFiles) => [...prevFiles, ...newFiles])

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prevFiles) => [...prevFiles, ...droppedFiles])
  }

  const resetForm = () => {
    setContent(initialData?.content || '')
    setFiles([])
    setExistingMedia(initialData?.media || [])
    setPostType(initialData?.postType || 'public')
    setIsOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0 && existingMedia.filter((m) => !m.isDeleted).length === 0) {
      toast.error('Vui lòng nhập nội dung hoặc thêm ảnh/video')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('content', content)
    formData.append('postType', postType)

    // Append files to formData
    files.forEach((file) => {
      formData.append('files', file)
    })

    // Nếu là chế độ chỉnh sửa, thêm thông tin về media đã xóa
    if (isEditMode) {
      // Thêm danh sách media cần giữ lại
      const keepMedia = existingMedia.filter((m) => !m.isDeleted).map((m) => m.public_id)
      formData.append('keepMedia', JSON.stringify(keepMedia))
    }

    try {
      let response

      if (isEditMode && postId) {
        // Cập nhật bài viết
        response = await postService.updatePost(postId, formData)
        toast.success('Cập nhật bài viết thành công!')
      } else {
        // Tạo bài viết mới
        response = await postService.createPost(formData)
        toast.success('Đăng bài viết thành công!')
      }

      // Invalidate tất cả các query liên quan đến bài viết
      queryClient.invalidateQueries({ queryKey: ['POSTS'] })

      // Invalidate danh sách bài viết của người dùng hiện tại
      if (session?.user?._id) {
        queryClient.invalidateQueries({ queryKey: ['USER_POSTS', session.user._id] })
      }

      // Nếu là chế độ chỉnh sửa, invalidate chi tiết bài viết
      if (isEditMode && postId) {
        queryClient.invalidateQueries({ queryKey: ['POST', postId] })
      }

      // Gọi callback nếu có
      if (onSuccess) {
        onSuccess()
      }

      resetForm()

      // Nếu là chế độ chỉnh sửa, chuyển hướng về trang chi tiết bài viết
      if (isEditMode && postId) {
        router.push(`/posts/${postId}`)
      }
    } catch (error) {
      console.error('Error submitting post:', error)
      toast.error(isEditMode ? 'Có lỗi xảy ra khi cập nhật bài viết' : 'Có lỗi xảy ra khi đăng bài viết')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  const toggleExistingMedia = (index: number) => {
    setExistingMedia((prevMedia) =>
      prevMedia.map((media, i) => (i === index ? { ...media, isDeleted: !media.isDeleted } : media))
    )
  }

  const renderFilePreview = (file: File, index: number) => {
    const objectUrl = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')

    return (
      <div key={index} className='relative aspect-square'>
        {isVideo ? (
          <div className='h-full w-full overflow-hidden rounded-lg'>
            <video
              src={objectUrl}
              className='h-full w-full object-cover'
              controls
              onError={() => {
                console.error('Video load error')
                URL.revokeObjectURL(objectUrl)
              }}
            />
          </div>
        ) : (
          <Image
            src={objectUrl}
            alt={`Preview ${index + 1}`}
            className='h-full w-full rounded-lg object-cover'
            layout='fill'
            objectFit='cover'
            onLoad={() => {
              URL.revokeObjectURL(objectUrl)
            }}
          />
        )}

        <button
          type='button'
          onClick={() => removeFile(index)}
          className='bg-foreground text-background hover:bg-foreground/60 absolute top-2 right-2 rounded-full p-1.5 transition-colors'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    )
  }

  const renderExistingMediaPreview = (media: any, index: number) => {
    const isVideo = media.type?.startsWith('video/')

    return (
      <div key={index} className={`relative aspect-square ${media.isDeleted ? 'opacity-50' : ''}`}>
        {isVideo ? (
          <div className='h-full w-full overflow-hidden rounded-lg'>
            <video src={media.url} className='h-full w-full object-cover' controls />
          </div>
        ) : (
          <Image
            src={media.url}
            alt={`Media ${index + 1}`}
            className='h-full w-full rounded-lg object-cover'
            layout='fill'
            objectFit='cover'
          />
        )}

        <button
          type='button'
          onClick={() => toggleExistingMedia(index)}
          className={`absolute top-2 right-2 rounded-full p-1.5 transition-colors ${
            media.isDeleted
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-foreground text-background hover:bg-foreground/60'
          }`}
        >
          {media.isDeleted ? <span className='text-xs font-medium'>Khôi phục</span> : <X className='h-4 w-4' />}
        </button>
      </div>
    )
  }

  // Nếu đang tải dữ liệu bài viết, hiển thị loading
  if (isLoading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center p-6'>
          <Loader2 className='text-primary h-8 w-8 animate-spin' />
        </CardContent>
      </Card>
    )
  }

  // Nếu là chế độ chỉnh sửa, hiển thị form chỉnh sửa trực tiếp
  if (isEditMode) {
    return (
      <div className='p-4'>
        <div className='grid gap-4'>
          <div className='flex items-center gap-2'>
            <Users className='text-muted-foreground h-4 w-4' />
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='Chọn quyền riêng tư' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='public'>Công khai</SelectItem>
                <SelectItem value='friends'>Bạn bè</SelectItem>
                <SelectItem value='private'>Chỉ mình tôi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder={`${session?.user?.name} ơi, bạn đang nghĩ gì thế?`}
            className='min-h-[200px] resize-none'
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className='grid gap-4'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='picture'>Media</Label>
              <div
                className='hover:bg-muted/50 cursor-pointer rounded-lg border p-2 text-center transition-colors'
                onClick={() => fileInputRef.current?.click()}
              >
                <Images className='text-muted-foreground h-5 w-5' />
              </div>
            </div>

            <Input
              id='picture'
              type='file'
              accept='image/*,video/*'
              multiple
              onChange={handleFileChange}
              className='hidden'
              ref={fileInputRef}
            />

            {/* Hiển thị media hiện có */}
            {existingMedia.length > 0 && (
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {existingMedia.map((media, index) => renderExistingMediaPreview(media, index))}
              </div>
            )}

            {/* Hiển thị file mới được chọn */}
            {files.length > 0 && (
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {files.map((file, index) => renderFilePreview(file, index))}
              </div>
            )}
          </div>

          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                resetForm()
                if (onSuccess) onSuccess()
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Chế độ tạo bài viết mới
  return (
    <Card>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className='grid gap-2 px-4'>
          <div className='flex items-center gap-3'>
            <Avatar className='h-10 w-10'>
              <AvatarImage src={session?.user?.avatar || ''} />
              <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <Input
              placeholder={`${session?.user?.name} ơi, bạn đang nghĩ gì thế?`}
              className='rounded-full'
              onFocus={() => {
                setIsOpen(true)
              }}
            />
          </div>
          <div className='mt-2 ml-auto flex gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setIsOpen(true)
              }}
            >
              <Images className='mr-2 h-4 w-4' /> Ảnh/video
            </Button>

            <DialogTrigger asChild>
              <Button variant='default'>{buttonText}</Button>
            </DialogTrigger>
          </div>
        </CardContent>

        <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-[600px]'>
          <DialogHeader className='flex-none'>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
            <div className='grid gap-2'>
              <div className='flex items-center gap-2'>
                <Users className='text-muted-foreground h-4 w-4' />
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Chọn quyền riêng tư' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='public'>Công khai</SelectItem>
                    <SelectItem value='friends'>Bạn bè</SelectItem>
                    <SelectItem value='private'>Chỉ mình tôi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>
          <div className='scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30 flex-1 overflow-y-auto'>
            <div className='grid gap-4'>
              <Textarea
                placeholder={`${session?.user?.name} ơi, bạn đang nghĩ gì thế?`}
                className='min-h-[200px] resize-none'
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <Label htmlFor='picture'>Upload photos</Label>
              <div className='grid gap-4'>
                <div
                  className='hover:bg-muted/50 w-full cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors'
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={handleDrop}
                >
                  <Input
                    id='picture'
                    type='file'
                    accept='image/*,video/*'
                    multiple
                    onChange={handleFileChange}
                    className='hidden'
                    ref={fileInputRef}
                  />
                  <Label htmlFor='picture' className='flex cursor-pointer items-center justify-center'>
                    <div className='flex flex-col items-center gap-2'>
                      <Images className='text-muted-foreground h-8 w-8' />
                      <p className='text-muted-foreground text-sm'>Drag and drop your images here or click to browse</p>
                    </div>
                  </Label>
                </div>

                {files.length > 0 && (
                  <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                    {files.map((file, index) => renderFilePreview(file, index))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className='grid flex-none gap-4 py-4'>
            <div className='flex justify-end gap-2'>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng...' : buttonText}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
