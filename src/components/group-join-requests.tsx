'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Check, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import httpRequest from '~/config/http-request'
import FriendHoverCard from './friend-hover-card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'

type JoinRequest = {
  userId: {
    _id: string
    name: string
    avatar: string
    username: string
  }
  requestedAt: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  invitedBy?: {
    _id: string
    name: string
    avatar: string
  }
}

type GroupJoinRequestsProps = {
  conversationId: string
  onRequestsChange?: () => void
}

export default function GroupJoinRequests({ conversationId, onRequestsChange }: GroupJoinRequestsProps) {
  const [activeTab, setActiveTab] = useState('pending')
  const queryClient = useQueryClient()

  // Fetch join requests
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['JOIN_REQUESTS', conversationId],
    queryFn: async () => {
      const response = await httpRequest.get(`/chat/group/${conversationId}/join-requests`)
      console.log('Join requests response:', response.data)
      return response.data.data
    }
  })

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return httpRequest.post(`/chat/group/${conversationId}/approve-join`, { userId })
    },
    onSuccess: () => {
      toast.success('Đã chấp nhận yêu cầu tham gia')
      refetch()
      if (onRequestsChange) onRequestsChange()
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversationId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  })

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return httpRequest.post(`/chat/group/${conversationId}/reject-join`, { userId })
    },
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu tham gia')
      refetch()
      if (onRequestsChange) onRequestsChange()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  })

  // Filter requests based on active tab
  const pendingRequests = data?.filter((req: JoinRequest) => req.status === 'PENDING') || []
  const approvedRequests = data?.filter((req: JoinRequest) => req.status === 'APPROVED') || []
  const rejectedRequests = data?.filter((req: JoinRequest) => req.status === 'REJECTED') || []
  console.log({
    pendingRequests,
    approvedRequests,
    rejectedRequests
  })
  const handleApprove = (userId: string) => {
    approveMutation.mutate(userId)
  }

  const handleReject = (userId: string) => {
    rejectMutation.mutate(userId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <UserPlus className='h-5 w-5' />
            <span>Yêu cầu tham gia</span>
          </CardTitle>
          <CardDescription>Quản lý các yêu cầu tham gia nhóm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                  <div className='space-y-1'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-24' />
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Skeleton className='h-9 w-9 rounded-md' />
                  <Skeleton className='h-9 w-9 rounded-md' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <UserPlus className='h-5 w-5' />
          <span>Yêu cầu tham gia</span>
          {pendingRequests.length > 0 && (
            <Badge variant='destructive' className='ml-2'>
              {pendingRequests.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Quản lý các yêu cầu tham gia nhóm</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <TabsTrigger value='approved'>Đã chấp nhận</TabsTrigger>
            <TabsTrigger value='rejected'>Đã từ chối</TabsTrigger>
          </TabsList>

          <TabsContent value='pending'>
            <ScrollArea className='h-[300px] pr-4'>
              {pendingRequests.length === 0 ? (
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
                              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: vi })}
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
            <ScrollArea className='h-[300px] pr-4'>
              {approvedRequests.length === 0 ? (
                <div className='text-muted-foreground py-8 text-center'>
                  <Users className='mx-auto h-10 w-10 opacity-50' />
                  <p className='mt-2'>Không có yêu cầu đã chấp nhận nào</p>
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
                              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: vi })}
                            </p>
                          </div>
                        </div>
                        <Badge variant='outline' className='border-green-500/20 bg-green-500/10 text-green-500'>
                          Đã chấp nhận
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
            <ScrollArea className='h-[300px] pr-4'>
              {rejectedRequests.length === 0 ? (
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
                              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: vi })}
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
      </CardContent>
    </Card>
  )
}
