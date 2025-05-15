'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Trash, Users, UserPlus, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

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
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { MAX_GROUP_MEMBERS } from '~/constants/app.constants'
import { MEMBER_ROLE } from '~/constants/enums'
import { useFriendsQuery } from '~/hooks/data/friends.hook'
import conversationsService from '~/services/conversations.service'
import httpRequest from '~/config/http-request'
import FriendHoverCard from './friend-hover-card'

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
      return response.data.data
    },
    enabled: !!conversation._id && open && activeTab === 'requests'
  })

  // Lọc danh sách yêu cầu theo trạng thái
  const pendingRequests = joinRequestsData?.requests?.filter((req: JoinRequest) => req.status === 'PENDING') || []
  const approvedRequests = joinRequestsData?.requests?.filter((req: JoinRequest) => req.status === 'APPROVED') || []
  const rejectedRequests = joinRequestsData?.requests?.filter((req: JoinRequest) => req.status === 'REJECTED') || []

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
      return httpRequest.post(`/chat/group/${conversation._id}/approve-join`, { userId })
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
      return httpRequest.post(`/chat/group/${conversation._id}/reject-join`, { userId })
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

  const handleApprove = (userId: string) => {
    approveMutation.mutate(userId)
  }

  const handleReject = (userId: string) => {
    rejectMutation.mutate(userId)
  }

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
                            <span className='ml-2 text-xs text-muted-foreground'>(Admin)</span>
                          )}
                          {participant._id === currentUserId && (
                            <span className='ml-2 text-xs text-muted-foreground'>(Bạn)</span>
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
                  <div className='p-4 text-center text-muted-foreground'>
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
                <Tabs defaultValue='pending'>
                  <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='pending' className='relative'>
                      Đang chờ
                      {pendingRequests.length > 0 && (
                        <Badge
                          variant='destructive'
                          className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center p-0'
                        >
                          {pendingRequests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value='approved'>Đã duyệt</TabsTrigger>
                    <TabsTrigger value='rejected'>Đã từ chối</TabsTrigger>
                  </TabsList>

                  <TabsContent value='pending'>
                    <ScrollArea className='h-[250px] pr-4'>
                      {isLoadingRequests ? (
                        <div className='flex justify-center p-4'>Đang tải...</div>
                      ) : pendingRequests.length === 0 ? (
                        <div className='py-8 text-center text-muted-foreground'>
                          <Users className='mx-auto h-10 w-10 opacity-50' />
                          <p className='mt-2'>Không có yêu cầu tham gia nào</p>
                        </div>
                      ) : (
                        <div className='mt-4 space-y-4'>
                          {pendingRequests.map((request: JoinRequest) => (
                            <div key={request.userId._id} className='flex flex-col gap-2'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                  <FriendHoverCard friend={request.userId}>
                                    <Avatar className='h-10 w-10 cursor-pointer'>
                                      <AvatarImage src={request.userId.avatar} alt={request.userId.name} />
                                      <AvatarFallback>{request.userId.name[0]}</AvatarFallback>
                                    </Avatar>
                                  </FriendHoverCard>
                                  <div>
                                    <p className='font-medium'>{request.userId.name}</p>
                                    <p className='text-xs text-muted-foreground'>
                                      {formatDistanceToNow(new Date(request.requestedAt), {
                                        addSuffix: true,
                                        locale: vi
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className='flex gap-2'>
                                  <Button
                                    size='icon'
                                    variant='outline'
                                    onClick={() => handleApprove(request.userId._id)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <Check className='h-4 w-4 text-green-500' />
                                  </Button>
                                  <Button
                                    size='icon'
                                    variant='outline'
                                    onClick={() => handleReject(request.userId._id)}
                                    disabled={rejectMutation.isPending}
                                  >
                                    <X className='h-4 w-4 text-red-500' />
                                  </Button>
                                </div>
                              </div>

                              {request.invitedBy && (
                                <div className='ml-12 text-xs text-muted-foreground'>
                                  Được mời bởi:
                                  <FriendHoverCard friend={request.invitedBy}>
                                    <span className='ml-1 cursor-pointer font-medium hover:underline'>
                                      {request.invitedBy.name}
                                    </span>
                                  </FriendHoverCard>
                                </div>
                              )}

                              <Separator className='mt-2' />
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value='approved'>
                    <ScrollArea className='h-[250px] pr-4'>
                      {isLoadingRequests ? (
                        <div className='flex justify-center p-4'>Đang tải...</div>
                      ) : approvedRequests.length === 0 ? (
                        <div className='py-8 text-center text-muted-foreground'>
                          <Users className='mx-auto h-10 w-10 opacity-50' />
                          <p className='mt-2'>Không có yêu cầu đã duyệt nào</p>
                        </div>
                      ) : (
                        <div className='mt-4 space-y-4'>
                          {approvedRequests.map((request: JoinRequest) => (
                            <div key={request.userId._id} className='flex flex-col gap-2'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                  <FriendHoverCard friend={request.userId}>
                                    <Avatar className='h-10 w-10 cursor-pointer'>
                                      <AvatarImage src={request.userId.avatar} alt={request.userId.name} />
                                      <AvatarFallback>{request.userId.name[0]}</AvatarFallback>
                                    </Avatar>
                                  </FriendHoverCard>
                                  <div>
                                    <p className='font-medium'>{request.userId.name}</p>
                                    <p className='text-xs text-muted-foreground'>
                                      {formatDistanceToNow(new Date(request.requestedAt), {
                                        addSuffix: true,
                                        locale: vi
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant='outline' className='border-green-500/20 bg-green-500/10 text-green-500'>
                                  Đã duyệt
                                </Badge>
                              </div>

                              {request.invitedBy && (
                                <div className='ml-12 text-xs text-muted-foreground'>
                                  Được mời bởi:
                                  <FriendHoverCard friend={request.invitedBy}>
                                    <span className='ml-1 cursor-pointer font-medium hover:underline'>
                                      {request.invitedBy.name}
                                    </span>
                                  </FriendHoverCard>
                                </div>
                              )}

                              <Separator className='mt-2' />
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value='rejected'>
                    <ScrollArea className='h-[250px] pr-4'>
                      {isLoadingRequests ? (
                        <div className='flex justify-center p-4'>Đang tải...</div>
                      ) : rejectedRequests.length === 0 ? (
                        <div className='py-8 text-center text-muted-foreground'>
                          <Users className='mx-auto h-10 w-10 opacity-50' />
                          <p className='mt-2'>Không có yêu cầu đã từ chối nào</p>
                        </div>
                      ) : (
                        <div className='mt-4 space-y-4'>
                          {rejectedRequests.map((request: JoinRequest) => (
                            <div key={request.userId._id} className='flex flex-col gap-2'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                  <FriendHoverCard friend={request.userId}>
                                    <Avatar className='h-10 w-10 cursor-pointer'>
                                      <AvatarImage src={request.userId.avatar} alt={request.userId.name} />
                                      <AvatarFallback>{request.userId.name[0]}</AvatarFallback>
                                    </Avatar>
                                  </FriendHoverCard>
                                  <div>
                                    <p className='font-medium'>{request.userId.name}</p>
                                    <p className='text-xs text-muted-foreground'>
                                      {formatDistanceToNow(new Date(request.requestedAt), {
                                        addSuffix: true,
                                        locale: vi
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant='outline' className='border-red-500/20 bg-red-500/10 text-red-500'>
                                  Đã từ chối
                                </Badge>
                              </div>

                              {request.invitedBy && (
                                <div className='ml-12 text-xs text-muted-foreground'>
                                  Được mời bởi:
                                  <FriendHoverCard friend={request.invitedBy}>
                                    <span className='ml-1 cursor-pointer font-medium hover:underline'>
                                      {request.invitedBy.name}
                                    </span>
                                  </FriendHoverCard>
                                </div>
                              )}

                              <Separator className='mt-2' />
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
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

