'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, UserPlus, Trash } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import conversationsService from '~/services/conversations.service'
import { MAX_GROUP_MEMBERS } from '~/constants/app.constants'

export function AddGroupMembersDialog({ conversation }: { conversation: any }) {
  const [open, setOpen] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('members')
  const [isAtMemberLimit, setIsAtMemberLimit] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<any>(null)
  
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { data: friends = [], isLoading } = useFriendsQuery()
  const currentUserId = session?.user?._id
  const isAdmin = conversation?.userId === currentUserId

  useEffect(() => {
    if (conversation?.participants?.length >= MAX_GROUP_MEMBERS) {
      setIsAtMemberLimit(true)
    } else {
      setIsAtMemberLimit(false)
    }
  }, [conversation?.participants?.length])

  // Lọc bạn bè chưa có trong nhóm
  const availableFriends = useMemo(() => {
    if (!friends || !Array.isArray(friends)) return []
    
    return friends.filter((friend: any) => {
      if (!friend || !friend._id) return false
      
      // Kiểm tra người này đã có trong nhóm chưa
      const isInGroup = conversation?.participants?.some(
        (p: any) => p._id === friend._id
      )
      
      // Lọc theo tên nếu có search query
      const matchesSearch = !searchQuery || 
        friend.name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return !isInGroup && matchesSearch
    })
  }, [friends, conversation?.participants, searchQuery])

  const addMembersMutation = useMutation({
    mutationFn: (userIds: string[]) => 
      conversationsService.addGroupMembers(conversation._id, userIds),
    onSuccess: () => {
      toast.success('Đã thêm thành viên vào nhóm')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      setOpen(false)
      setSelectedFriends([])
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi thêm thành viên')
    }
  })

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => 
      conversationsService.removeGroupMember(conversation._id, userId),
    onSuccess: () => {
      toast.success('Đã xóa thành viên khỏi nhóm')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      setAlertOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa thành viên')
      setAlertOpen(false)
    }
  })

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSelectedFriends([])
      setSearchQuery('')
      setActiveTab('members')
    }
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    )
  }

  const handleAddMembers = () => {
    if (selectedFriends.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người bạn')
      return
    }

    addMembersMutation.mutate(selectedFriends)
  }

  const handleRemoveUser = (member: any) => {
    setMemberToRemove(member)
    setAlertOpen(true)
  }

  const confirmRemoveUser = () => {
    if (memberToRemove) {
      removeUserMutation.mutate(memberToRemove._id)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setOpen(true)}
              >
                <Users className="h-5 w-5" />
                <span className="sr-only">Thành viên nhóm</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isAtMemberLimit 
                ? `Đã đạt giới hạn ${MAX_GROUP_MEMBERS} thành viên` 
                : 'Thành viên nhóm'}
            </TooltipContent>
          </Tooltip>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thành viên nhóm</DialogTitle>
            <DialogDescription>
              Nhóm có {conversation?.participants?.length || 0} thành viên (tối đa {MAX_GROUP_MEMBERS})
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Thành viên</TabsTrigger>
              <TabsTrigger value="add" disabled={isAtMemberLimit}>Thêm thành viên</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="py-4">
              <div className="max-h-[300px] overflow-y-auto">
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
                        onClick={() => handleRemoveUser(participant)}
                        disabled={removeUserMutation.isPending}
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Xóa
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="add" className="py-4">
              <Input
                placeholder="Tìm kiếm bạn bè..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              
              <div className="max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center p-4">Đang tải...</div>
                ) : availableFriends.length === 0 ? (
                  <div className="text-center p-4 text-muted-foreground">
                    {searchQuery ? 'Không tìm thấy bạn bè phù hợp' : 'Không có bạn bè nào để thêm vào nhóm'}
                  </div>
                ) : (
                  availableFriends.map((friend: any) => (
                    <div key={friend._id} className="flex items-center space-x-2 py-2">
                      <Checkbox
                        id={`friend-${friend._id}`}
                        checked={selectedFriends.includes(friend._id)}
                        onCheckedChange={() => toggleFriendSelection(friend._id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar} alt={friend.name} />
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Label htmlFor={`friend-${friend._id}`} className="cursor-pointer">
                        {friend.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleAddMembers} 
                  disabled={selectedFriends.length === 0 || addMembersMutation.isPending}
                >
                  {addMembersMutation.isPending ? 'Đang thêm...' : 'Thêm thành viên'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* AlertDialog xác nhận xóa thành viên */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa thành viên {memberToRemove?.name} khỏi nhóm?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeUserMutation.isPending}
            >
              {removeUserMutation.isPending ? 'Đang xóa...' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


