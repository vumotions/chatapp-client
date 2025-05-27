'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Check, Loader2, RefreshCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Link } from '~/i18n/navigation'
import conversationsService from '~/services/conversations.service'
import FriendHoverCard from './friend-hover-card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'

// Định nghĩa kiểu dữ liệu cho request
type JoinRequest = {
  userId: {
    _id: string
    name: string
    avatar: string
    username: string
  }
  requestedAt: string
  processedAt?: string // Thời gian xử lý (phê duyệt hoặc từ chối)
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  invitedBy?: {
    _id: string
    name: string
    avatar: string
    username: string
  }
  processedBy?: {
    _id: string
    name: string
    avatar: string
    username: string
  }
}

type GroupJoinRequestsProps = {
  conversationId: string
  canApproveRequests: boolean
  onDataChange?: () => void
}

export default function GroupJoinRequests({
  conversationId,
  canApproveRequests,
  onDataChange
}: GroupJoinRequestsProps) {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Lấy danh sách yêu cầu tham gia
  const {
    data: joinRequestsData,
    isLoading,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['JOIN_REQUESTS', conversationId, activeTab],
    queryFn: async () => {
      const response = await conversationsService.getJoinRequests(conversationId, activeTab)
      return response
    },
    enabled: !!conversationId && canApproveRequests,
    refetchOnWindowFocus: true,
    staleTime: 10000 // 10 giây
  })

  // Lấy số lượng yêu cầu đang chờ
  const { data: pendingRequestsData } = useQuery({
    queryKey: ['JOIN_REQUESTS_COUNT', conversationId],
    queryFn: async () => {
      const response = await conversationsService.getJoinRequests(conversationId, 'PENDING')
      return response
    },
    enabled: !!conversationId && canApproveRequests,
    refetchOnWindowFocus: true,
    staleTime: 10000 // 10 giây
  })

  // Tính số lượng yêu cầu đang chờ
  const pendingCount = pendingRequestsData?.length || 0

  // Mutation để phê duyệt yêu cầu tham gia
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return conversationsService.approveJoinRequest(conversationId, userId)
    },
    onSuccess: (data) => {
      // Kiểm tra nếu người dùng đã là thành viên
      if (data?.alreadyMember) {
        toast.info('Người dùng đã là thành viên của nhóm')
      } else {
        toast.success('Đã chấp nhận yêu cầu tham gia')
      }

      // Cập nhật lại danh sách yêu cầu tham gia
      refetch()

      // Thông báo cho component cha
      if (onDataChange) {
        onDataChange()
      }
    },
    onError: (error: any) => {
      console.error('Error approving request:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi chấp nhận yêu cầu')

      // Cập nhật lại danh sách yêu cầu tham gia
      refetch()
    }
  })

  // Mutation để từ chối yêu cầu tham gia
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return conversationsService.rejectJoinRequest(conversationId, userId)
    },
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu tham gia')

      // Cập nhật lại danh sách yêu cầu tham gia
      refetch()

      // Thông báo cho component cha
      if (onDataChange) {
        onDataChange()
      }
    },
    onError: (error: any) => {
      console.error('Error rejecting request:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi từ chối yêu cầu')

      // Cập nhật lại danh sách yêu cầu tham gia
      refetch()
    }
  })

  // Mutation để xóa tất cả yêu cầu tham gia theo trạng thái
  const deleteAllRequestsMutation = useMutation({
    mutationFn: async (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
      return conversationsService.deleteAllJoinRequests(conversationId, status)
    },
    onSuccess: () => {
      toast.success(
        `Đã xóa tất cả yêu cầu ${
          activeTab === 'PENDING' ? 'đang chờ' : activeTab === 'APPROVED' ? 'đã chấp nhận' : 'đã từ chối'
        }`
      )

      // Cập nhật lại danh sách yêu cầu tham gia
      refetch()

      // Nếu xóa tab PENDING, cần cập nhật lại số lượng
      if (activeTab === 'PENDING') {
        queryClient.invalidateQueries({ queryKey: ['JOIN_REQUESTS_COUNT', conversationId] })
      }

      // Thông báo cho component cha
      if (onDataChange) {
        onDataChange()
      }

      // Đóng dialog
      setIsDeleteDialogOpen(false)
    },
    onError: (error: any) => {
      console.error('Error deleting requests:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa yêu cầu')
      setIsDeleteDialogOpen(false)
    }
  })

  // Xử lý chuyển tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'PENDING' | 'APPROVED' | 'REJECTED')
  }

  // Xử lý xóa tất cả yêu cầu
  const handleDeleteAllRequests = () => {
    deleteAllRequestsMutation.mutate(activeTab)
  }

  // Xử lý refresh danh sách
  const handleRefresh = () => {
    refetch()
  }

  // Lấy tiêu đề cho dialog xóa
  const getDeleteDialogTitle = () => {
    switch (activeTab) {
      case 'PENDING':
        return 'Xóa tất cả yêu cầu đang chờ'
      case 'APPROVED':
        return 'Xóa tất cả yêu cầu đã chấp nhận'
      case 'REJECTED':
        return 'Xóa tất cả yêu cầu đã từ chối'
    }
  }

  // Lấy mô tả cho dialog xóa
  const getDeleteDialogDescription = () => {
    switch (activeTab) {
      case 'PENDING':
        return 'Bạn có chắc chắn muốn xóa tất cả yêu cầu đang chờ? Hành động này không thể hoàn tác.'
      case 'APPROVED':
        return 'Bạn có chắc chắn muốn xóa tất cả yêu cầu đã chấp nhận? Hành động này không thể hoàn tác và không ảnh hưởng đến tư cách thành viên hiện tại.'
      case 'REJECTED':
        return 'Bạn có chắc chắn muốn xóa tất cả yêu cầu đã từ chối? Hành động này không thể hoàn tác.'
    }
  }

  return (
    <div className='w-full'>
      <div className='flex w-full flex-col'>
        <Tabs defaultValue='PENDING' value={activeTab} onValueChange={handleTabChange}>
          {/* Tab list không có các nút bổ sung */}
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='PENDING' className='relative'>
              Đang chờ
              {pendingCount > 0 && (
                <span className='bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]'>
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='APPROVED'>Đã chấp nhận</TabsTrigger>
            <TabsTrigger value='REJECTED'>Đã từ chối</TabsTrigger>
          </TabsList>

          <TabsContent value='PENDING' className='mt-2'>
            {isLoading || isFetching ? (
              <>
                {/* Skeleton cho buttons */}
                <div className='mt-2 mb-1 flex justify-end gap-1'>
                  <Skeleton className='h-7 w-7 rounded-md' />
                  <Skeleton className='h-7 w-7 rounded-md' />
                </div>

                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='space-y-4'>
                    {Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <Card key={`skeleton-${index}`} className='bg-card border-border py-2'>
                          <CardContent className='flex items-center justify-between px-2'>
                            <div className='flex items-center gap-3'>
                              <Skeleton className='h-10 w-10 rounded-full' />
                              <div className='space-y-1'>
                                <Skeleton className='h-4 w-32' />
                                <Skeleton className='h-3 w-24' />
                              </div>
                            </div>
                            <div className='flex gap-2'>
                              <Skeleton className='h-8 w-8 rounded-full' />
                              <Skeleton className='h-8 w-8 rounded-full' />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </>
            ) : joinRequestsData?.length === 0 ? (
              <div className='min-h-[340px]'>
                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='flex h-full items-center justify-center'>
                    <p className='text-muted-foreground text-sm italic'>
                      {activeTab === 'PENDING'
                        ? 'Không có yêu cầu tham gia nào đang chờ xử lý'
                        : activeTab === 'APPROVED'
                          ? 'Không có yêu cầu tham gia nào đã được chấp nhận'
                          : 'Không có yêu cầu tham gia nào đã bị từ chối'}
                    </p>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <>
                <div className='mt-2 mb-1 flex justify-end gap-1'>
                  {/* Button Refresh */}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={handleRefresh}
                    disabled={isFetching}
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span className='sr-only'>Làm mới</span>
                  </Button>

                  {/* Button Delete All */}
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='outline'
                        size='icon'
                        className='text-destructive hover:bg-destructive/10 h-7 w-7'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                        <span className='sr-only'>Xóa tất cả</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{getDeleteDialogTitle()}</AlertDialogTitle>
                        <AlertDialogDescription>{getDeleteDialogDescription()}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllRequests}
                          className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                          Xóa tất cả
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='space-y-4'>
                    {joinRequestsData?.map((request: JoinRequest) => (
                      <RequestItem
                        key={`${request.userId._id}-${request.requestedAt}-${activeTab}`}
                        request={request}
                        status={activeTab}
                        onApprove={(userId) => approveMutation.mutateAsync(userId)}
                        onReject={(userId) => rejectMutation.mutateAsync(userId)}
                        isPendingApprove={approveMutation.isPending}
                        isPendingReject={rejectMutation.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value='APPROVED' className='mt-2'>
            {isLoading || isFetching ? (
              <>
                {/* Skeleton cho buttons */}
                <div className='mt-2 mb-1 flex justify-end gap-1'>
                  <Skeleton className='h-7 w-7 rounded-md' />
                  <Skeleton className='h-7 w-7 rounded-md' />
                </div>

                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='space-y-4'>
                    {Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <Card key={`skeleton-${index}`} className='bg-card border-border py-2'>
                          <CardContent className='flex items-center justify-between px-2'>
                            <div className='flex items-center gap-3'>
                              <Skeleton className='h-10 w-10 rounded-full' />
                              <div className='space-y-1'>
                                <Skeleton className='h-4 w-32' />
                                <Skeleton className='h-3 w-24' />
                              </div>
                            </div>
                            <div className='flex gap-2'>
                              <Skeleton className='h-8 w-8 rounded-full' />
                              <Skeleton className='h-8 w-8 rounded-full' />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </>
            ) : joinRequestsData?.length === 0 ? (
              <div className='min-h-[340px]'>
                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='flex h-full items-center justify-center'>
                    <p className='text-muted-foreground text-sm italic'>
                      {activeTab === 'PENDING'
                        ? 'Không có yêu cầu tham gia nào đang chờ xử lý'
                        : activeTab === 'APPROVED'
                          ? 'Không có yêu cầu tham gia nào đã được chấp nhận'
                          : 'Không có yêu cầu tham gia nào đã bị từ chối'}
                    </p>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <>
                <div className='mt-2 mb-1 flex justify-end gap-1'>
                  {/* Button Refresh */}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={handleRefresh}
                    disabled={isFetching}
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span className='sr-only'>Làm mới</span>
                  </Button>

                  {/* Button Delete All */}
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='outline'
                        size='icon'
                        className='text-destructive hover:bg-destructive/10 h-7 w-7'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                        <span className='sr-only'>Xóa tất cả</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{getDeleteDialogTitle()}</AlertDialogTitle>
                        <AlertDialogDescription>{getDeleteDialogDescription()}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllRequests}
                          className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                          Xóa tất cả
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='space-y-4'>
                    {joinRequestsData?.map((request: JoinRequest) => (
                      <RequestItem
                        key={`${request.userId._id}-${request.requestedAt}-${activeTab}`}
                        request={request}
                        status={activeTab}
                        isPendingApprove={approveMutation.isPending}
                        isPendingReject={rejectMutation.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value='REJECTED' className='mt-2'>
            {isLoading || isFetching ? (
              <>
                {/* Skeleton cho buttons */}
                <div className='mt-2 mb-1 flex justify-end gap-1'>
                  <Skeleton className='h-7 w-7 rounded-md' />
                  <Skeleton className='h-7 w-7 rounded-md' />
                </div>

                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='space-y-4'>
                    {Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <Card key={`skeleton-${index}`} className='bg-card border-border py-2'>
                          <CardContent className='flex items-center justify-between px-2'>
                            <div className='flex items-center gap-3'>
                              <Skeleton className='h-10 w-10 rounded-full' />
                              <div className='space-y-1'>
                                <Skeleton className='h-4 w-32' />
                                <Skeleton className='h-3 w-24' />
                              </div>
                            </div>
                            <div className='flex gap-2'>
                              <Skeleton className='h-8 w-8 rounded-full' />
                              <Skeleton className='h-8 w-8 rounded-full' />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </>
            ) : joinRequestsData?.length === 0 ? (
              <div className='min-h-[340px]'>
                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='flex h-full items-center justify-center'>
                    <p className='text-muted-foreground text-sm italic'>
                      {activeTab === 'PENDING'
                        ? 'Không có yêu cầu tham gia nào đang chờ xử lý'
                        : activeTab === 'APPROVED'
                          ? 'Không có yêu cầu tham gia nào đã được chấp nhận'
                          : 'Không có yêu cầu tham gia nào đã bị từ chối'}
                    </p>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <>
                <div className='mt-2 mb-1 flex justify-end gap-1'>
                  {/* Button Refresh */}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={handleRefresh}
                    disabled={isFetching}
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span className='sr-only'>Làm mới</span>
                  </Button>

                  {/* Button Delete All */}
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='outline'
                        size='icon'
                        className='text-destructive hover:bg-destructive/10 h-7 w-7'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                        <span className='sr-only'>Xóa tất cả</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{getDeleteDialogTitle()}</AlertDialogTitle>
                        <AlertDialogDescription>{getDeleteDialogDescription()}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllRequests}
                          className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                          Xóa tất cả
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <ScrollArea className='-mr-4 h-[300px] pr-4'>
                  <div className='space-y-4'>
                    {joinRequestsData?.map((request: JoinRequest) => (
                      <RequestItem
                        key={`${request.userId._id}-${request.requestedAt}-${activeTab}`}
                        request={request}
                        status={activeTab}
                        isPendingApprove={approveMutation.isPending}
                        isPendingReject={rejectMutation.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

const RequestItem = ({
  request,
  status,
  onApprove,
  onReject,
  isPendingApprove = false,
  isPendingReject = false
}: {
  request: JoinRequest
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  onApprove?: (userId: string) => Promise<any>
  onReject?: (userId: string) => Promise<any>
  isPendingApprove?: boolean
  isPendingReject?: boolean
}) => {
  const [isApprovePending, setIsApprovePending] = useState(false)
  const [isRejectPending, setIsRejectPending] = useState(false)

  const handleApprove = async () => {
    if (!onApprove || isApprovePending || isRejectPending) return
    setIsApprovePending(true)
    try {
      await onApprove(request.userId._id)
    } catch (error) {
      console.error('Error in handleApprove:', error)
    } finally {
      setIsApprovePending(false)
    }
  }

  const handleReject = async () => {
    if (!onReject || isApprovePending || isRejectPending) return

    setIsRejectPending(true)
    try {
      await onReject(request.userId._id)
    } catch (error) {
      console.error('Error in handleReject:', error)
    } finally {
      setIsRejectPending(false)
    }
  }

  // Hàm lấy thời gian hiển thị dựa trên trạng thái
  const getDisplayTime = () => {
    if ((status === 'APPROVED' || status === 'REJECTED') && request.processedAt) {
      return formatDistanceToNow(new Date(request.processedAt), { addSuffix: true, locale: vi })
    } else {
      return formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: vi })
    }
  }

  // Hàm lấy nhãn thời gian dựa trên trạng thái
  const getTimeLabel = () => {
    if (status === 'APPROVED') {
      return 'Đã chấp nhận:'
    } else if (status === 'REJECTED') {
      return 'Đã từ chối:'
    } else {
      return 'Yêu cầu:'
    }
  }

  // Hàm lấy màu sắc cho nhãn thời gian
  const getTimeLabelColor = () => {
    if (status === 'APPROVED') {
      return 'text-green-500'
    } else if (status === 'REJECTED') {
      return 'text-red-500'
    } else {
      return 'text-muted-foreground'
    }
  }

  return (
    <Card className='bg-background border-border py-2'>
      <CardContent className='flex items-center justify-between px-2'>
        <div className='flex items-center gap-3'>
          <FriendHoverCard friend={request.userId}>
            <Avatar className='h-10 w-10 cursor-pointer'>
              <AvatarImage src={request.userId.avatar} alt={request.userId.name} />
              <AvatarFallback>{request.userId.name[0]}</AvatarFallback>
            </Avatar>
          </FriendHoverCard>
          <div>
            <p className='font-medium'>{request.userId.name}</p>
            <div className='flex items-center gap-1'>
              <span className={`text-xs ${getTimeLabelColor()} font-medium`}>{getTimeLabel()}</span>
              <span className='text-muted-foreground text-xs'>{getDisplayTime()}</span>
            </div>
            {request.invitedBy && (
              <p className='text-muted-foreground text-xs'>
                Được mời bởi:{' '}
                <Link href={`/profile/${request.invitedBy.username}`} target='_blank' className='hover:underline'>
                  {request.invitedBy.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        {status === 'PENDING' && (
          <div className='flex gap-2'>
            {onApprove && (
              <Button
                size='icon'
                variant='default'
                className='h-8 w-8'
                onClick={handleApprove}
                disabled={isApprovePending || isRejectPending || isPendingApprove || isPendingReject}
              >
                {isApprovePending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check className='h-4 w-4' />}
                <span className='sr-only'>Chấp nhận</span>
              </Button>
            )}

            {onReject && (
              <Button
                size='icon'
                variant='destructive'
                className='h-8 w-8'
                onClick={handleReject}
                disabled={isApprovePending || isRejectPending || isPendingApprove || isPendingReject}
              >
                {isRejectPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <X className='h-4 w-4' />}
                <span className='sr-only'>Từ chối</span>
              </Button>
            )}
          </div>
        )}

        {status === 'APPROVED' && (
          <Badge variant='outline' className='border-green-500/20 bg-green-500/10 text-green-500'>
            Đã chấp nhận
          </Badge>
        )}

        {status === 'REJECTED' && (
          <Badge variant='outline' className='border-red-500/20 bg-red-500/10 text-red-500'>
            Đã từ chối
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

// Hàm định dạng thời gian
const formatDate = (dateString: string) => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi })
}
