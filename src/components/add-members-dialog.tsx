import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
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
import { ScrollArea } from '~/components/ui/scroll-area'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import conversationsService from '~/services/conversations.service'

export function AddMembersDialog({ conversation }: { conversation: any }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Sử dụng hook có sẵn thay vì tự định nghĩa query
  const { data: friends, isLoading } = useFriendsQuery()

  // Lọc danh sách bạn bè không có trong nhóm
  const filteredFriends = friends?.filter(
    (friend: any) => 
      !conversation.participants.some((p: any) => p._id === friend._id) &&
      (searchQuery === '' || 
       friend.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const addMembersMutation = useMutation({
    mutationFn: (userIds: string[]) => 
      conversationsService.addGroupMembers(conversation._id, userIds),
    onSuccess: () => {
      toast.success('Đã thêm thành viên vào nhóm')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
      setOpen(false)
      setSelectedUsers([])
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi thêm thành viên')
    }
  })

  const handleAddMembers = () => {
    if (selectedUsers.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người bạn')
      return
    }

    addMembersMutation.mutate(selectedUsers)
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Thêm thành viên
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thêm thành viên</DialogTitle>
          <DialogDescription>
            Chọn bạn bè để thêm vào nhóm chat
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Input
            placeholder="Tìm kiếm bạn bè..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex justify-center p-4">Đang tải...</div>
            ) : filteredFriends?.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                {searchQuery ? 'Không tìm thấy bạn bè phù hợp' : 'Tất cả bạn bè đã ở trong nhóm'}
              </div>
            ) : (
              filteredFriends?.map((friend: any) => (
                <div key={friend._id} className="flex items-center space-x-4 p-2">
                  <Checkbox
                    id={`user-${friend._id}`}
                    checked={selectedUsers.includes(friend._id)}
                    onCheckedChange={() => toggleUserSelection(friend._id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback>{friend.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor={`user-${friend._id}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {friend.name}
                  </label>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
          >
            {addMembersMutation.isPending ? 'Đang thêm...' : 'Thêm thành viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


