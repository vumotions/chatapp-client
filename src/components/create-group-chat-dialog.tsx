'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from '~/i18n/navigation'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import conversationService from '~/services/conversations.service'
import { GROUP_TYPE } from '~/constants/enums'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Switch } from './ui/switch'
import { CreateGroupChatData } from '~/types/chat.types'
import { ScrollArea } from './ui/scroll-area'
import { useFileUpload } from '~/hooks/data/upload.hooks'
import { Upload } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export function CreateGroupChatDialog() {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [groupType, setGroupType] = useState(GROUP_TYPE.PUBLIC)
  const [requireApproval, setRequireApproval] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const { data: friends } = useFriendsQuery()
  const queryClient = useQueryClient()
  const router = useRouter()

  const createGroupMutation = useMutation({
    mutationFn: (data: CreateGroupChatData) => conversationService.createGroupConversation(data),
    onSuccess: (response) => {
      toast.success('Tạo nhóm chat thành công')
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      setOpen(false)
      // Chuyển hướng đến trang chat mới
      router.push(`/messages/${response.data?._id}`)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo nhóm')
    }
  })

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm')
      return
    }

    if (selectedFriends.length < 2) {
      toast.error('Vui lòng chọn ít nhất 2 người bạn')
      return
    }

    createGroupMutation.mutate({
      participants: selectedFriends,
      name: groupName,
      avatar: avatarUrl,
      groupType: groupType,
      requireApproval: requireApproval
    })
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
  }

  // Xử lý khi click vào button
  const handleButtonClick = () => {
    console.log('Opening dialog')
    setOpen(true)
  }

  // Reset form khi đóng dialog
  useEffect(() => {
    if (!open) {
      setGroupName('')
      setSelectedFriends([])
      setAvatarUrl('')
    }
  }, [open])

  useEffect(() => {
    if (groupType === GROUP_TYPE.PRIVATE) {
      setRequireApproval(true)
    }
  }, [groupType])

  const { mutate: uploadAvatar, isPending: isUploading } = useFileUpload({
    onSuccess: (data) => {
      if (data?.urls && data.urls.length > 0) {
        setAvatarUrl(data.urls[0])
        toast.success('Ảnh đại diện đã được tải lên')
      }
    },
    onError: (error) => {
      toast.error('Lỗi khi tải lên ảnh đại diện')
    }
  })

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      uploadAvatar([file])
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline' size='icon' onClick={handleButtonClick}>
            <UserPlus className='h-5 w-5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Tạo nhóm chat</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Tạo nhóm chat mới</DialogTitle>
            <DialogDescription>Tạo nhóm chat với bạn bè của bạn. Nhóm cần có ít nhất 3 thành viên.</DialogDescription>
          </DialogHeader>

          <ScrollArea className='-mr-4 grid max-h-[55vh] gap-4 py-6 pr-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='name' className='text-right'>
                Tên nhóm
              </Label>
              <Input
                id='name'
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className='col-span-3'
              />
            </div>

            <div className='mt-4 grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='avatar' className='text-right'>
                Avatar nhóm
              </Label>
              <div className='col-span-3 flex gap-2'>
                <Input
                  id='avatar'
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder='URL hình ảnh'
                  className='flex-1'
                  disabled={isUploading}
                />
                <div className='relative'>
                  <Input
                    type='file'
                    id='avatar-upload'
                    className='absolute inset-0 cursor-pointer opacity-0'
                    accept='image/*'
                    onChange={handleAvatarUpload}
                    disabled={isUploading}
                    multiple={false} // Chỉ cho phép chọn 1 file
                  />
                  <Button type='button' variant='outline' size='icon' disabled={isUploading}>
                    {isUploading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Upload className='h-4 w-4' />}
                  </Button>
                </div>
              </div>
            </div>

            {avatarUrl && (
              <div className='my-2 flex justify-center'>
                <Avatar className='h-20 w-20'>
                  <AvatarImage src={avatarUrl} alt='Group avatar preview' />
                  <AvatarFallback>{groupName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            )}

            <div className='mt-4'>
              <Label>Chọn bạn bè</Label>
              <div className='mt-2'>
                {friends?.map((friend: any) => (
                  <div key={friend._id} className='flex items-center space-x-2 py-2'>
                    <Checkbox
                      id={`friend-${friend._id}`}
                      checked={selectedFriends.includes(friend._id)}
                      onCheckedChange={() => toggleFriendSelection(friend._id)}
                    />
                    <Avatar className='h-8 w-8'>
                      <AvatarImage src={friend.avatar} alt={friend.name} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor={`friend-${friend._id}`} className='cursor-pointer'>
                      {friend.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-4 space-y-4'>
              <div className='space-y-4'>
                <Label>Loại nhóm</Label>
                <RadioGroup
                  value={groupType}
                  onValueChange={(value) => setGroupType(value as GROUP_TYPE)}
                  className='flex flex-col space-y-2'
                >
                  <div className='flex items-start space-x-2'>
                    <RadioGroupItem value={GROUP_TYPE.PUBLIC} id='public' className='mt-1' />
                    <div>
                      <Label htmlFor='public'>Công khai</Label>
                      <p className='text-muted-foreground text-xs'>
                        Nhóm có thể được tìm thấy trong tìm kiếm. Bạn có thể chọn yêu cầu phê duyệt hoặc cho phép tham
                        gia tự do.
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-2'>
                    <RadioGroupItem value={GROUP_TYPE.PRIVATE} id='private' className='mt-1' />
                    <div>
                      <Label htmlFor='private'>Riêng tư</Label>
                      <p className='text-muted-foreground text-xs'>
                        Nhóm không hiển thị trong tìm kiếm. Chỉ những người được mời mới có thể thấy và yêu cầu tham
                        gia. Luôn yêu cầu phê duyệt.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className='flex items-center justify-between rounded-lg border p-3'>
                <div>
                  <Label htmlFor='requireApproval' className='mb-1 block'>
                    Yêu cầu phê duyệt khi tham gia
                  </Label>
                  <p className='text-muted-foreground text-xs'>
                    {groupType === GROUP_TYPE.PRIVATE
                      ? 'Nhóm riêng tư luôn yêu cầu phê duyệt khi tham gia'
                      : requireApproval
                        ? 'Người dùng cần được phê duyệt trước khi tham gia nhóm'
                        : 'Người dùng có thể tham gia nhóm ngay lập tức qua link mời'}
                  </p>
                </div>
                <Switch
                  id='requireApproval'
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                  disabled={groupType === GROUP_TYPE.PRIVATE}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? 'Đang tạo...' : 'Tạo nhóm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Để hỗ trợ cả hai cách import
export default CreateGroupChatDialog




