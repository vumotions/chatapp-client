import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { useBlockUserMutation } from '~/hooks/data/user.hooks'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '~/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

interface UserProfileActionsProps {
  userId: string
  username: string
}

export default function UserProfileActions({ userId, username }: UserProfileActionsProps) {
  const { data: session } = useSession()
  const blockUserMutation = useBlockUserMutation()
  const [isBlocking, setIsBlocking] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)

  const handleBlockUser = () => {
    // Kiểm tra xem có phải đang cố gắng block chính mình không
    const currentUserId = session?.user?._id

    if (currentUserId === userId) {
      toast.error('Không thể chặn chính mình')
      setShowBlockDialog(false)
      return
    }

    blockUserMutation.mutate(userId)
    setShowBlockDialog(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-5 w-5' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>Chặn người dùng</DropdownMenuItem>
          <DropdownMenuItem>Báo cáo</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chặn người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn chặn @{username}? Người này sẽ không thể:
              <ul className='mt-2 list-disc pl-5'>
                <li>Nhắn tin cho bạn</li>
                <li>Gửi lời mời kết bạn</li>
                <li>Xem bài viết của bạn</li>
                <li>Tìm thấy bạn trong tìm kiếm</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isBlocking}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isBlocking ? 'Đang chặn...' : 'Chặn'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
