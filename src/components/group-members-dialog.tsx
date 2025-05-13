import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { UsersIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import conversationsService from '~/services/conversations.service'

export function GroupMembersDialog({ conversation }: { conversation: any }) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  const isAdmin = conversation?.userId === currentUserId
  const queryClient = useQueryClient()

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => 
      conversationsService.removeGroupMember(conversation._id, userId),
    onSuccess: () => {
      toast.success('Đã xóa thành viên khỏi nhóm')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa thành viên')
    }
  })

  const handleRemoveUser = (userId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?')) {
      removeUserMutation.mutate(userId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UsersIcon className="mr-2 h-4 w-4" />
          Thành viên
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thành viên nhóm</DialogTitle>
          <DialogDescription>
            Nhóm có {conversation?.participants?.length || 0} thành viên
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[300px] overflow-y-auto py-4">
          {conversation?.participants?.map((participant: any) => (
            <div key={participant._id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={participant.avatar} alt={participant.name} />
                  <AvatarFallback>{participant.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {participant.name}
                    {participant._id === conversation.userId && (
                      <span className="text-muted-foreground ml-2 text-xs">(Admin)</span>
                    )}
                    {participant._id === currentUserId && (
                      <span className="text-muted-foreground ml-2 text-xs">(Bạn)</span>
                    )}
                  </p>
                </div>
              </div>
              {isAdmin && participant._id !== currentUserId && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveUser(participant._id)}
                  disabled={removeUserMutation.isPending}
                >
                  Xóa
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}