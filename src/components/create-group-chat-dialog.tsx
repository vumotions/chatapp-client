'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from '~/i18n/navigation'
import { useMessagesTranslation } from '~/hooks/use-translations'

import { Loader2, Trash, Upload } from 'lucide-react'
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
import { GROUP_TYPE } from '~/constants/enums'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import { useFileUpload } from '~/hooks/data/upload.hooks'
import conversationService from '~/services/conversations.service'
import { CreateGroupChatData } from '~/types/chat.types'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { ScrollArea } from './ui/scroll-area'
import { Switch } from './ui/switch'

export function CreateGroupChatDialog() {
  const t = useMessagesTranslation()
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [groupType, setGroupType] = useState(GROUP_TYPE.PUBLIC)
  const [requireApproval, setRequireApproval] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [showAvatar, setShowAvatar] = useState(true)
  const { data: friends } = useFriendsQuery()
  const queryClient = useQueryClient()
  const router = useRouter()

  const createGroupMutation = useMutation({
    mutationFn: (data: CreateGroupChatData) => conversationService.createGroupConversation(data),
    onSuccess: (response) => {
      toast.success(t('createGroupSuccess'))
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      setOpen(false)
      // Chuyển hướng đến trang chat mới
      router.push(`/messages/${response.data?._id}`)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('createGroupError'))
    }
  })

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast.error(t('enterGroupName'))
      return
    }

    if (selectedFriends.length < 2) {
      toast.error(t('selectAtLeastTwoFriends'))
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
        toast.success(t('fileUploadSuccess'))
      }
    },
    onError: (error) => {
      toast.error(t('fileUploadError'))
    }
  })

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      uploadAvatar([file])
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
    setAvatarFile(null)
    setShowAvatar(true) // Reset lại trạng thái hiển thị
    toast.success(t('avatarRemoved'))
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant='outline' size='icon' onClick={handleButtonClick}>
            <UserPlus className='h-5 w-5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('createGroupChat')}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>{t('createNewGroupChat')}</DialogTitle>
            <DialogDescription>{t('createGroupChatDescription')}</DialogDescription>
          </DialogHeader>

          <ScrollArea className='-mr-4 grid max-h-[55vh] gap-4 py-6 pr-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='name' className='text-right'>
                {t('groupName')}
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
                {t('groupAvatar')}
              </Label>
              <div className='col-span-3 flex gap-2'>
                <Input
                  id='avatar'
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder={t('imageUrl')}
                  className='flex-1'
                  disabled={isUploading}
                />
                <div className='relative'>
                  {avatarUrl ? (
                    <Button
                      type='button'
                      variant='destructive'
                      size='icon'
                      onClick={handleRemoveAvatar}
                      disabled={isUploading}
                    >
                      <Trash className='h-4 w-4' />
                    </Button>
                  ) : (
                    <>
                      <Input
                        type='file'
                        id='avatar-upload'
                        className='absolute inset-0 cursor-pointer opacity-0'
                        accept='image/*'
                        onChange={handleAvatarUpload}
                        disabled={isUploading}
                        multiple={false}
                      />
                      <Button type='button' variant='outline' size='icon' disabled={isUploading}>
                        {isUploading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Upload className='h-4 w-4' />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {avatarUrl && showAvatar && (
              <div className='my-2 flex justify-center'>
                <Avatar className='h-20 w-20'>
                  <AvatarImage src={avatarUrl} alt={t('groupAvatarPreview')} />
                  <AvatarFallback>{groupName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            )}

            <div className='mt-5'>
              <Label>{t('selectFriends')}</Label>
              <div className='mt-2'>
                <div className='rounded-md border px-2 py-3'>
                  <ScrollArea className='h-[220px]'>
                    <div className='space-y-2 px-2'>
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
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className='mt-4 space-y-4'>
              <div className='space-y-4'>
                <Label>{t('groupType')}</Label>
                <RadioGroup
                  value={groupType}
                  onValueChange={(value) => setGroupType(value as GROUP_TYPE)}
                  className='flex flex-col space-y-2'
                >
                  <div className='flex items-start space-x-2'>
                    <RadioGroupItem value={GROUP_TYPE.PUBLIC} id='public' className='mt-1' />
                    <div>
                      <Label htmlFor='public'>{t('public')}</Label>
                      <p className='text-muted-foreground text-xs'>{t('publicGroupDescription')}</p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-2'>
                    <RadioGroupItem value={GROUP_TYPE.PRIVATE} id='private' className='mt-1' />
                    <div>
                      <Label htmlFor='private'>{t('private')}</Label>
                      <p className='text-muted-foreground text-xs'>{t('privateGroupDescription')}</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className='flex items-center justify-between rounded-lg border p-3'>
                <div>
                  <Label htmlFor='requireApproval' className='mb-1 block'>
                    {t('requireApprovalToJoin')}
                  </Label>
                  <p className='text-muted-foreground text-xs'>
                    {groupType === GROUP_TYPE.PRIVATE
                      ? t('privateGroupAlwaysRequiresApproval')
                      : requireApproval
                        ? t('usersNeedApproval')
                        : t('usersCanJoinImmediately')}
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
              {createGroupMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {t('creating')}
                </>
              ) : (
                t('createGroup')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Để hỗ trợ cả hai cách import
export default CreateGroupChatDialog
