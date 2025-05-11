import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import conversationsService from '~/services/conversations.service'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

export function GroupSettingsDialog({ conversation, onUpdate }: { conversation: any; onUpdate?: () => void }) {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState(conversation?.name || '')
  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  const isAdmin = conversation?.userId === currentUserId
  const queryClient = useQueryClient()
  const router = useRouter()

  // Cập nhật tên nhóm khi conversation thay đổi
  useEffect(() => {
    if (conversation?.name) {
      setGroupName(conversation.name)
    }
  }, [conversation])

  const updateGroupMutation = useMutation({
    mutationFn: (data: { name: string }) => conversationsService.updateGroupConversation(conversation._id, data),
    onSuccess: () => {
      toast.success('Cập nhật nhóm thành công')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      setOpen(false)
      if (onUpdate) onUpdate()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật nhóm')
    }
  })

  const leaveGroupMutation = useMutation({
    mutationFn: () => conversationsService.leaveGroupConversation(conversation._id),
    onSuccess: () => {
      toast.success('Đã rời khỏi nhóm')
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      setOpen(false)
      router.push('/messages')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi rời nhóm')
    }
  })

  const handleUpdateGroup = () => {
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm')
      return
    }

    updateGroupMutation.mutate({ name: groupName })
  }

  const handleLeaveGroup = () => {
    if (window.confirm('Bạn có chắc muốn rời khỏi nhóm này?')) {
      leaveGroupMutation.mutate()
    }
  }

  // Hàm debug để kiểm tra sự kiện click
  const handleTriggerClick = () => {
    console.log('Settings button clicked')
    setOpen(true)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon' onClick={handleTriggerClick}>
              <Settings className='h-5 w-5' />
              <span className='sr-only'>Cài đặt nhóm</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Cài đặt nhóm</TooltipContent>
      </Tooltip>

      <SheetContent side='right' className='w-full w-screen px-4 py-6'>
        <SheetHeader className='p-0 pt-2'>
          <SheetTitle>Cài đặt nhóm</SheetTitle>
        </SheetHeader>
        <div className='flex-1 space-y-6 overflow-y-auto py-6'>
          {isAdmin ? (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Tên nhóm</Label>
                <Input id='name' value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>

              <Button onClick={handleUpdateGroup} disabled={updateGroupMutation.isPending} className='w-full'>
                {updateGroupMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
              </Button>
            </div>
          ) : (
            <p className='text-muted-foreground'>Chỉ admin mới có thể thay đổi thông tin nhóm</p>
          )}

          <div className='border-t pt-4'>
            <Button
              variant='destructive'
              onClick={handleLeaveGroup}
              disabled={leaveGroupMutation.isPending}
              className='w-full'
            >
              {leaveGroupMutation.isPending ? 'Đang xử lý...' : 'Rời nhóm'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
