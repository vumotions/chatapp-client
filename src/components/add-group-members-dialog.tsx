'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import httpRequest from '~/config/http-request'
import { MAX_GROUP_MEMBERS } from '~/constants/app.constants'
import { MEMBER_ROLE } from '~/constants/enums'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import conversationsService from '~/services/conversations.service'
import GroupJoinRequests from './group-join-requests'

type JoinRequest = {
  _id: string
  userId: {
    _id: string
    name: string
    avatar: string
    email: string
  }
  requestedAt: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  invitedBy?: {
    _id: string
    name: string
    avatar: string
  }
}

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

  // Kiểm tra quyền của người dùng hiện tại
  const currentMember = conversation?.participants?.find((p: any) => p._id === currentUserId)
  const isOwnerOrAdmin = isAdmin || currentMember?.role === MEMBER_ROLE.ADMIN
  const canApproveRequests = isOwnerOrAdmin || currentMember?.permissions?.approveJoinRequests

  // Lấy danh sách yêu cầu tham gia
  const {
    data: joinRequestsData,
    isLoading: isLoadingRequests,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['JOIN_REQUESTS', conversation._id],
    queryFn: async () => {
      const response = await httpRequest.get(`/chat/group/${conversation._id}/join-requests`)
      return response.data.data // Trả về mảng trong trường data
    },
    enabled: !!conversation._id && open && activeTab === 'requests'
  })

  // Lọc danh sách yêu cầu theo trạng thái - sửa lại cách lọc
  const pendingRequests = joinRequestsData?.filter((req: JoinRequest) => req.status === 'PENDING') || []
  const approvedRequests = joinRequestsData?.filter((req: JoinRequest) => req.status === 'APPROVED') || []
  const rejectedRequests = joinRequestsData?.filter((req: JoinRequest) => req.status === 'REJECTED') || []

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
      const isInGroup = conversation?.participants?.some((p: any) => p._id === friend._id)

      // Lọc theo tên nếu có search query
      const matchesSearch = !searchQuery || friend.name?.toLowerCase().includes(searchQuery.toLowerCase())

      return !isInGroup && matchesSearch
    })
  }, [friends, conversation?.participants, searchQuery])

  const addMembersMutation = useMutation({
    mutationFn: (userIds: string[]) => conversationsService.addGroupMembers(conversation._id, userIds),
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
    mutationFn: (userId: string) => conversationsService.removeGroupMember(conversation._id, userId),
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

  // Mutation để phê duyệt yêu cầu tham gia
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return httpRequest.post(`/chat/group/${conversation._id}/approve-request/${userId}`)
    },
    onSuccess: () => {
      toast.success('Đã chấp nhận yêu cầu tham gia')
      refetchRequests()
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  })

  // Mutation để từ chối yêu cầu tham gia
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return httpRequest.post(`/chat/group/${conversation._id}/reject-request/${userId}`)
    },
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu tham gia')
      refetchRequests()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
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
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
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

  console.log({ pendingRequests, rejectedRequests, approvedRequests })
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' onClick={() => setOpen(true)}>
                <Users className='h-5 w-5' />
                <span className='sr-only'>Thành viên nhóm</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isAtMemberLimit ? `Đã đạt giới hạn ${MAX_GROUP_MEMBERS} thành viên` : 'Thành viên nhóm'}
            </TooltipContent>
          </Tooltip>
        </DialogTrigger>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Thành viên nhóm</DialogTitle>
            <DialogDescription>
              Nhóm có {conversation?.participants?.length || 0} thành viên (tối đa {MAX_GROUP_MEMBERS})
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue='members' value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${canApproveRequests ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value='members'>Thành viên</TabsTrigger>
              <TabsTrigger value='add' disabled={isAtMemberLimit}>
                Thêm thành viên
              </TabsTrigger>
              {canApproveRequests && (
                <TabsTrigger value='requests' className='relative'>
                  Yêu cầu
                  {pendingRequests.length > 0 && (
                    <Badge
                      variant='destructive'
                      className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center p-0'
                    >
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value='members' className='py-4'>
              <div className='max-h-[300px] overflow-y-auto'>
                {conversation?.participants?.map((participant: any) => (
                  <div key={participant._id} className='flex items-center justify-between py-2'>
                    <div className='flex items-center gap-3'>
                      <Avatar className='h-8 w-8'>
                        <AvatarImage src={participant.avatar} alt={participant.name} />
                        <AvatarFallback>{participant.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='font-medium'>
                          {participant.name}
                          {participant._id === conversation.userId && (
                            <span className='text-muted-foreground ml-2 text-xs'>(Admin)</span>
                          )}
                          {participant._id === currentUserId && (
                            <span className='text-muted-foreground ml-2 text-xs'>(Bạn)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isAdmin && participant._id !== currentUserId && (
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() => handleRemoveUser(participant)}
                        disabled={removeUserMutation.isPending}
                      >
                        <Trash className='mr-1 h-4 w-4' />
                        Xóa
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value='add' className='py-4'>
              <Input
                placeholder='Tìm kiếm bạn bè...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='mb-4'
              />

              <div className='max-h-[300px] overflow-y-auto'>
                {isLoading ? (
                  <div className='flex justify-center p-4'>Đang tải...</div>
                ) : availableFriends.length === 0 ? (
                  <div className='text-muted-foreground p-4 text-center'>
                    {searchQuery ? 'Không tìm thấy bạn bè phù hợp' : 'Không có bạn bè nào để thêm vào nhóm'}
                  </div>
                ) : (
                  availableFriends.map((friend: any) => (
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
                  ))
                )}
              </div>

              <div className='mt-4 flex justify-end'>
                <Button
                  onClick={handleAddMembers}
                  disabled={selectedFriends.length === 0 || addMembersMutation.isPending}
                >
                  {addMembersMutation.isPending ? 'Đang thêm...' : 'Thêm thành viên'}
                </Button>
              </div>
            </TabsContent>

            {/* Tab yêu cầu tham gia - chỉ hiển thị cho người có quyền */}
            {canApproveRequests && (
              <TabsContent value='requests' className='py-4'>
                <GroupJoinRequests
                  pendingRequests={pendingRequests}
                  approvedRequests={approvedRequests}
                  rejectedRequests={rejectedRequests}
                  isLoading={isLoadingRequests}
                  canApproveRequests={canApproveRequests}
                  onApprove={async (userId) => {
                    await approveMutation.mutateAsync(userId);
                  }}
                  onReject={async (userId) => {
                    await rejectMutation.mutateAsync(userId);
                  }}
                  onRequestsChange={() => {
                    // Cập nhật lại dữ liệu khi có thay đổi
                    queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
                    queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
                    refetchRequests()
                  }}
                />
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {memberToRemove?.name} khỏi nhóm chat này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveUser}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}



