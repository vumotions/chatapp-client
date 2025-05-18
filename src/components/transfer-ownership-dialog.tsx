import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Shield } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { useFriendsWithRolesQuery } from '~/hooks/data/friends.hook'
import { useTransferOwnershipMutation } from '~/hooks/data/group-chat.hooks'
import { useLeaveGroupMutation } from '~/hooks/data/group-chat.hooks'
import { MEMBER_ROLE } from '~/constants/enums'

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  conversation,
  onComplete
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: any
  onComplete?: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [isLeaveAfterTransfer, setIsLeaveAfterTransfer] = useState(true)

  const { data: session } = useSession()
  const currentUserId = session?.user?._id

  // Lấy danh sách thành viên
  const { data, isLoading } = useFriendsWithRolesQuery(open ? conversation?._id : undefined)
  
  // Trích xuất members từ data
  const membersWithRoles = data?.members || []
  
  // Lọc danh sách thành viên theo tìm kiếm và loại trừ người dùng hiện tại
  const filteredMembers = Array.isArray(membersWithRoles)
    ? membersWithRoles
        .filter((member: any) => member.inGroup)
        .filter((member: any) => member._id.toString() !== currentUserId?.toString())
        .filter((member: any) => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  // Mutation để chuyển quyền chủ nhóm
  const transferOwnershipMutation = useTransferOwnershipMutation(conversation?._id)
  
  // Mutation để rời nhóm sau khi chuyển quyền
  const leaveGroupMutation = useLeaveGroupMutation(conversation?._id)

  const handleTransferOwnership = async () => {
    if (!selectedMember) {
      toast.error('Vui lòng chọn một thành viên để chuyển quyền chủ nhóm')
      return
    }

    try {
      await transferOwnershipMutation.mutateAsync(selectedMember)
      
      if (isLeaveAfterTransfer) {
        await leaveGroupMutation.mutateAsync()
      }
      
      onOpenChange(false)
      if (onComplete) onComplete()
    } catch (error) {
      console.error('Error transferring ownership:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển quyền chủ nhóm</DialogTitle>
          <DialogDescription>
            Chọn một thành viên để chuyển quyền chủ nhóm. Người này sẽ có toàn quyền quản lý nhóm.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <ScrollArea className="h-72">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member: any) => (
                  <div
                    key={member._id}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                      selectedMember === member._id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMember(member._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.role === MEMBER_ROLE.ADMIN ? 'Quản trị viên' : 'Thành viên'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedMember === member._id && (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="leave-after-transfer"
              checked={isLeaveAfterTransfer}
              onChange={(e) => setIsLeaveAfterTransfer(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="leave-after-transfer" className="text-sm">
              Rời nhóm sau khi chuyển quyền
            </label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleTransferOwnership} 
            disabled={!selectedMember || transferOwnershipMutation.isPending}
          >
            {transferOwnershipMutation.isPending ? 'Đang xử lý...' : 'Chuyển quyền'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


