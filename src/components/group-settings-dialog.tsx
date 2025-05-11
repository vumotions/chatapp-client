import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Settings } from 'lucide-react'
import conversationsService from '~/services/conversations.service'

export function GroupSettingsDialog({ conversation, onUpdate }: { conversation: any, onUpdate?: () => void }) {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState(conversation?.name || '')
  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  const isAdmin = conversation?.userId === currentUserId
  const queryClient = useQueryClient()
  const router = useRouter()

  const updateGroupMutation = useMutation({
    mutationFn: (data: { name: string }) => 
      conversationsService.updateGroupConversation(conversation._id, data),
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Cài đặt nhóm
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cài đặt nhóm</DialogTitle>
          <DialogDescription>
            Thay đổi cài đặt cho nhóm chat này
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isAdmin ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Tên nhóm
              </Label>
              <Input
                id="name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="col-span-3"
              />
            </div>
          ) : (
            <p>Chỉ admin mới có thể thay đổi thông tin nhóm</p>
          )}
        </div>
        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={handleLeaveGroup}
            disabled={leaveGroupMutation.isPending}
          >
            {leaveGroupMutation.isPending ? 'Đang xử lý...' : 'Rời nhóm'}
          </Button>
          
          {isAdmin && (
            <Button 
              onClick={handleUpdateGroup} 
              disabled={updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}