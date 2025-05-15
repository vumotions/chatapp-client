'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Users, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import httpRequest from '~/config/http-request'
import { MEMBER_ROLE } from '~/constants/enums'
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

interface GroupMembersModalProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupMembersModal({ conversationId, open, onOpenChange }: GroupMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('members')
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentUserId = session?.user?._id

  // Lấy thông tin nhóm và thành viên
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['GROUP_DETAILS', conversationId],
    queryFn: async () => {
      const response = await httpRequest.get(`/chat/conversations/${conversationId}`)
      return response.data.data
    },
    enabled: !!conversationId && open
  })

  // Lấy danh sách yêu cầu tham gia
  const {
    data: joinRequestsData,
    isLoading: isLoadingRequests,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['JOIN_REQUESTS', conversationId],
    queryFn: async () => {
      const response = await httpRequest.get(`/chat/group/${conversationId}/join-requests`)
      return response.data.data
    },
    enabled: !!conversationId && open && activeTab === 'requests'
  })

  // Kiểm tra quyền của người dùng hiện tại
  const currentMember = conversation?.members?.find((m: any) => m.userId._id === currentUserId)
  const isOwnerOrAdmin = currentMember?.role === MEMBER_ROLE.OWNER || currentMember?.role === MEMBER_ROLE.ADMIN
  const canApproveRequests = isOwnerOrAdmin || currentMember?.permissions?.approveJoinRequests

  // Lọc danh sách yêu cầu theo trạng thái
  const pendingRequests = joinRequestsData?.requests?.filter((req: JoinRequest) => req.status === 'PENDING') || []
  const approvedRequests = joinRequestsData?.requests?.filter((req: JoinRequest) => req.status === 'APPROVED') || []
  const rejectedRequests = joinRequestsData?.requests?.filter((req: JoinRequest) => req.status === 'REJECTED') || []

  // Mutation để thêm thành viên
  const addMembersMutation = useMutation({
    mutationFn: (userIds: string[]) => httpRequest.post(`/chat/group/${conversationId}/members`, { userIds }),
    onSuccess: () => {
      toast.success('Đã thêm thành viên vào nhóm')
      queryClient.invalidateQueries({ queryKey: ['GROUP_DETAILS', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversationId] })
      setSelectedFriends([])
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi thêm thành viên')
    }
  })

  // Mutation để phê duyệt yêu cầu tham gia
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return httpRequest.post(`/chat/group/${conversationId}/approve-join`, { userId })
    },
    onSuccess: () => {
      toast.success('Đã chấp nhận yêu cầu tham gia')
      refetchRequests()
      queryClient.invalidateQueries({ queryKey: ['GROUP_DETAILS', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversationId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  })

  // Mutation để từ chối yêu cầu tham gia
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return httpRequest.post(`/chat/group/${conversationId}/reject-join`, { userId })
    },
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu tham gia')
      refetchRequests()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  })

  const handleAddMembers = () => {
    if (selectedFriends.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người bạn')
      return
    }

    addMembersMutation.mutate(selectedFriends)
  }

  const handleApprove = (userId: string) => {
    approveMutation.mutate(userId)
  }

  const handleReject = (userId: string) => {
    rejectMutation.mutate(userId)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFriends([])
      setSearchQuery('')
      setActiveTab('members')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Thành viên nhóm</DialogTitle>
          <DialogDescription>Nhóm có {conversation?.members?.length || 0} thành viên (tối đa 100)</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${canApproveRequests ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value='members'>Thành viên</TabsTrigger>
            <TabsTrigger value='add'>Thêm thành viên</TabsTrigger>
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

          {/* Tab danh sách thành viên */}
          <TabsContent value='members'>
            <Input
              placeholder='Tìm kiếm thành viên...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='mb-4'
            />
            <ScrollArea className='h-[300px]'>
              {isLoading ? (
                <div className='flex justify-center p-4'>Đang tải...</div>
              ) : (
                conversation?.members
                  ?.filter((member: any) => member.userId.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((member: any) => (
                    <div key={member.userId._id} className='flex items-center justify-between py-2'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src={member.userId.avatar} alt={member.userId.name} />
                          <AvatarFallback>{member.userId.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className='font-medium'>
                            {member.userId.name}
                            {member.userId._id === currentUserId && ' (Bạn)'}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {member.role === MEMBER_ROLE.OWNER
                              ? 'Chủ nhóm'
                              : member.role === MEMBER_ROLE.ADMIN
                                ? 'Quản trị viên'
                                : 'Thành viên'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </ScrollArea>
          </TabsContent>

          {/* Tab thêm thành viên */}
          <TabsContent value='add'>
            <Input
              placeholder='Tìm kiếm bạn bè...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='mb-4'
            />
            <ScrollArea className='h-[300px]'>
              {isLoading ? (
                <div className='flex justify-center p-4'>Đang tải...</div>
              ) : (
                <div className='space-y-4'>
                  {/* Hiển thị danh sách bạn bè để thêm vào nhóm */}
                  {/* Đây là phần mẫu, cần thay thế bằng dữ liệu thực tế */}
                  <div className='flex items-center space-x-4 p-2'>
                    <Checkbox
                      id='user-1'
                      checked={selectedFriends.includes('user-1')}
                      onCheckedChange={() => {
                        if (selectedFriends.includes('user-1')) {
                          setSelectedFriends(selectedFriends.filter((id) => id !== 'user-1'))
                        } else {
                          setSelectedFriends([...selectedFriends, 'user-1'])
                        }
                      }}
                    />
                    <Avatar className='h-8 w-8'>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <Label htmlFor='user-1' className='flex-1 cursor-pointer'>
                      Người dùng mẫu
                    </Label>
                  </div>
                </div>
              )}
            </ScrollArea>
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
            <TabsContent value='requests'>
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
                      <div className='text-muted-foreground py-8 text-center'>
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
                                  <p className='text-muted-foreground text-xs'>
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
                              <div className='text-muted-foreground ml-12 text-xs'>
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
                      <div className='text-muted-foreground py-8 text-center'>
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
                                  <p className='text-muted-foreground text-xs'>
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
                              <div className='text-muted-foreground ml-12 text-xs'>
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
                      <div className='text-muted-foreground py-8 text-center'>
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
                                  <p className='text-muted-foreground text-xs'>
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
                              <div className='text-muted-foreground ml-12 text-xs'>
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
  )
}
