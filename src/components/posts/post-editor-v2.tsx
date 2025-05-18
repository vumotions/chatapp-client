import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Images, SmilePlus, Users, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { useSession } from 'next-auth/react'
import { useState, useRef } from 'react'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import Image from 'next/image'
import postService from '~/services/post.service'
import { toast } from 'sonner'

export default function PostEditorV2({getPosts}) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [postType, setPostType] = useState('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Cộng dồn files mới vào mảng files hiện tại thay vì ghi đè
      const newFiles = Array.from(e.target.files)
      setFiles(prevFiles => [...prevFiles, ...newFiles])
      
      // Reset input để có thể chọn lại file đã chọn trước đó
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prevFiles => [...prevFiles, ...droppedFiles])
  }

  const resetForm = () => {
    setContent('')
    setFiles([])
    setPostType('public')
    setIsOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
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

    try {
      const response = await postService.createPost(formData)
      await getPosts()
      toast.success('Đăng bài viết thành công!')
      resetForm()
    } catch (error) {
      console.error('Error submitting post:', error)
      toast.error('Có lỗi xảy ra khi đăng bài viết')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hàm render preview cho video
  const renderFilePreview = (file: File, index: number) => {
    const isVideo = file.type.startsWith('video/')
    // Tạo một object URL mới cho mỗi lần render
    const objectUrl = URL.createObjectURL(file)

    return (
      <div key={index} className='relative aspect-square'>
        {isVideo ? (
          <div className='h-full w-full rounded-lg overflow-hidden'>
            <video
              src={objectUrl}
              className='h-full w-full object-cover'
              controls
              // Không revoke URL khi video đang được sử dụng
              // Chỉ cleanup khi component unmount
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
              // Đối với ảnh, có thể revoke sau khi đã load xong
              URL.revokeObjectURL(objectUrl)
            }}
          />
        )}
        <button
          onClick={() => {
            // Khi xóa file, cần revoke URL để tránh memory leak
            URL.revokeObjectURL(objectUrl)
            setFiles(files.filter((_, i) => i !== index))
          }}
          className='bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute top-1 right-1 rounded-full p-1'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    )
  }

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
            <Button variant='outline'>
              <SmilePlus className='h-4 w-4' />
            </Button>
            <DialogTrigger asChild>
              <Button variant='default'>Post</Button>
            </DialogTrigger>
          </div>
        </CardContent>

        <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-[600px]'>
          <DialogHeader className='flex-none'>
            <DialogTitle>Tạo bài viết mới</DialogTitle>
            <DialogDescription>Chia sẻ suy nghĩ của bạn</DialogDescription>
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
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                    {files.map((file, index) => renderFilePreview(file, index))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className='grid flex-none gap-4 py-4'>
            <div className='flex justify-end gap-2'>
              <Button variant='outline'>
                <SmilePlus className='h-4 w-4' />
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang đăng...' : 'Post'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
