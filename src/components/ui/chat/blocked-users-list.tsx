'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBlockedUsers, useUnblockUserMutation } from '~/hooks/data/user.hooks'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { ScrollArea } from '~/components/ui/scroll-area'
import { UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function BlockedUsersList() {
  const router = useRouter()
  const { data: blockedUsers, isLoading, isError, refetch } = useBlockedUsers()
  const unblockUser = useUnblockUserMutation()
  
  // Xử lý khi bỏ chặn người dùng
  const handleUnblock = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    unblockUser.mutate(userId, {
      onSuccess: () => {
        toast.success('Đã bỏ chặn người dùng')
        refetch()
      }
    })
  }
  
  // Xử lý khi click vào người dùng
  const handleUserClick = (userId: string) => {
    // Tạo cuộc trò chuyện mới hoặc mở cuộc trò chuyện hiện có với người dùng
    router.push(`/messages?newChat=${userId}`)
  }
  
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Không thể tải danh sách người dùng bị chặn</p>
        <Button variant="outline" className="mt-2" onClick={() => refetch()}>
          Thử lại
        </Button>
      </div>
    )
  }
  
  if (!blockedUsers || blockedUsers.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Bạn chưa chặn người dùng nào</p>
      </div>
    )
  }
  
  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="p-4 space-y-2">
        {blockedUsers.map((user: any) => (
          <div 
            key={user._id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer"
            onClick={() => handleUserClick(user._id)}
          >
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-1"
              onClick={(e) => handleUnblock(user._id, e)}
            >
              <UserCheck className="h-4 w-4" />
              <span>Bỏ chặn</span>
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
