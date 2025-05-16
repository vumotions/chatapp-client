'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Check, Loader2, UserPlus, Users, X } from 'lucide-react'
import { useState, useEffect } from 'react'
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
import { MEMBER_ROLE } from '~/constants/enums'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Link } from '~/i18n/navigation'

// Định nghĩa kiểu dữ liệu cho request
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
    username: string
  }
}

type GroupJoinRequestsProps = {
  pendingRequests: JoinRequest[]
  approvedRequests: JoinRequest[]
  rejectedRequests: JoinRequest[]
  isLoading: boolean
  canApproveRequests: boolean
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
  onRequestsChange?: () => void
}

export default function GroupJoinRequests({
  pendingRequests = [],
  approvedRequests = [],
  rejectedRequests = [],
  isLoading,
  canApproveRequests,
  onApprove,
  onReject,
  onRequestsChange
}: GroupJoinRequestsProps) {
  const [activeTab, setActiveTab] = useState('pending')

  // Thêm các hàm xử lý sự kiện
  const handleApprove = (userId: string) => {
    console.log('Approving user:', userId)
    onApprove(userId)
  }

  const handleReject = (userId: string) => {
    console.log('Rejecting user:', userId)
    onReject(userId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='mt-2 h-4 w-64' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-20 w-full' />
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
                  {pendingRequests.map((request: JoinRequest, index: number) => (
                    <RequestItem
                      key={`${request.userId._id}-${request.requestedAt}-${index}`}
                      request={request}
                      status='PENDING'
                      onApprove={canApproveRequests ? handleApprove : undefined}
                      onReject={canApproveRequests ? handleReject : undefined}
                    />
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
                  {approvedRequests.map((request: JoinRequest, index: number) => (
                    <RequestItem
                      key={`${request.userId._id}-${request.requestedAt}-${index}`}
                      request={request}
                      status='APPROVED'
                    />
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
                  {rejectedRequests.map((request: JoinRequest, index: number) => (
                    <RequestItem
                      key={`${request.userId._id}-${request.requestedAt}-${index}`}
                      request={request}
                      status='REJECTED'
                    />
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

const RequestItem = ({
  request,
  status,
  onApprove,
  onReject
}: {
  request: JoinRequest
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  onApprove?: (userId: string) => void
  onReject?: (userId: string) => void
}) => {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove?.(request.userId._id)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await onReject?.(request.userId._id)
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className='flex items-center justify-between py-2'>
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
              variant='outline' 
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Check className='h-4 w-4 text-green-500' />
              )}
            </Button>
          )}

          {onReject && (
            <Button 
              size='icon' 
              variant='outline' 
              onClick={handleReject}
              disabled={isApproving || isRejecting}
            >
              {isRejecting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <X className='h-4 w-4 text-red-500' />
              )}
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
    </div>
  )
}




