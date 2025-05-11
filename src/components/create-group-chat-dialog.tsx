import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '~/i18n/navigation'

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
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Checkbox } from '~/components/ui/checkbox'
import conversationService from '~/services/conversations.service'
import { useFriendsQuery } from '~/hooks/data/friends.hook'

export function CreateGroupChatDialog() {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const { data: friends } = useFriendsQuery()
  const queryClient = useQueryClient()
  const router = useRouter()

  const createGroupMutation = useMutation({
    mutationFn: (data: { participants: string[]; name: string }) => conversationService.createGroupConversation(data),
    onSuccess: (response) => {
      toast.success('Tạo nhóm chat thành công')
      queryClient.invalidateQueries({ queryKey: ['CONVERSATIONS'] })
      setOpen(false)
      // Chuyển hướng đến trang chat mới
      router.push(`/messages/${response.data.data._id}`)
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
      name: groupName
    })
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>Tạo nhóm chat</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Tạo nhóm chat mới</DialogTitle>
          <DialogDescription>Tạo nhóm chat với bạn bè của bạn. Nhóm cần có ít nhất 3 thành viên.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='name' className='text-right'>
              Tên nhóm
            </Label>
            <Input id='name' value={groupName} onChange={(e) => setGroupName(e.target.value)} className='col-span-3' />
          </div>
          <div className='mt-4'>
            <Label>Chọn bạn bè</Label>
            <div className='mt-2 max-h-60 overflow-y-auto'>
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
        </div>
        <DialogFooter>
          <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
            {createGroupMutation.isPending ? 'Đang tạo...' : 'Tạo nhóm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
