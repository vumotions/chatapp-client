import { Search, Shield } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { MEMBER_ROLE } from '~/constants/enums'
import { useFriendsWithRolesQuery } from '~/hooks/data/friends.hook'
import { useLeaveGroupMutation, useTransferOwnershipMutation } from '~/hooks/data/group-chat.hooks'
import { useMessagesTranslation } from '~/hooks/use-translations'
import { cn } from '~/lib/utils'
import { Label } from './ui/label'

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
  const t = useMessagesTranslation()

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
      toast.error(t('selectMemberToTransfer'))
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
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('transferOwnership')}</DialogTitle>
          <DialogDescription>{t('transferOwnershipDescription')}</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='flex items-center'>
            <Label
              htmlFor='name'
              className={cn(
                buttonVariants({ size: 'icon', variant: 'outline' }),
                'rounded-tr-none rounded-br-none hover:bg-inherit'
              )}
            >
              <Search className='text-muted-foreground h-4 w-4' />
            </Label>
            <Input
              id='name'
              placeholder={t('searchMembers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='flex-1 rounded-tl-none rounded-bl-none'
            />
          </div>

          <ScrollArea className='h-72'>
            {isLoading ? (
              <div className='flex h-full items-center justify-center'>
                <p className='text-muted-foreground text-sm'>{t('loading')}</p>
              </div>
            ) : (
              <div className='space-y-2'>
                {filteredMembers.map((member: any) => (
                  <div
                    key={member._id}
                    className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${
                      selectedMember === member._id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMember(member._id)}
                  >
                    <div className='flex items-center space-x-3'>
                      <Avatar className='h-8 w-8'>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium'>{member.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {member.role === MEMBER_ROLE.ADMIN ? t('admin') : t('member')}
                        </p>
                      </div>
                    </div>

                    {selectedMember === member._id && <Shield className='text-primary h-4 w-4' />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className='flex items-center space-x-2'>
            <input
              type='checkbox'
              id='leave-after-transfer'
              checked={isLeaveAfterTransfer}
              onChange={(e) => setIsLeaveAfterTransfer(e.target.checked)}
              className='text-primary focus:ring-primary rounded border-gray-300'
            />
            <label htmlFor='leave-after-transfer' className='text-sm'>
              {t('leaveAfterTransfer')}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleTransferOwnership} disabled={!selectedMember || transferOwnershipMutation.isPending}>
            {transferOwnershipMutation.isPending ? t('processing') : t('transferOwnership')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
