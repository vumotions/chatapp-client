import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import friendService from '~/services/friend.service'

export const useFriendsQuery = () => {
  const { data: session } = useSession()
  return useQuery({
    queryKey: ['FRIENDS'],
    queryFn: friendService.getFriendsList,
    select: (res) => res.data.data,
    enabled: !!session
  })
}

export const useFriendSuggestionsQuery = () => {
  const { data: session } = useSession()
  return useQuery({
    queryKey: ['FRIEND_SUGGESTIONS'],
    queryFn: friendService.getFriendSuggestions,
    select: (res) => res.data.data,
    enabled: !!session
  })
}

export const useSendFriendRequestMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => friendService.sendFriendRequest(userId),
    // Không cập nhật cache ở đây, để component FriendSuggestions xử lý
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Không thể gửi lời mời kết bạn'
      toast.error(errorMessage)
    }
  })
}

export const useAcceptFriendRequestMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (senderId: string) => friendService.acceptFriendRequest(senderId),
    onSuccess: () => {
      toast.success('Đã chấp nhận lời mời kết bạn')
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
    onError: () => {
      toast.error('Chấp nhận lời mời thất bại')
    }
  })
}

export const useRejectFriendRequestMutation = () => {
  return useMutation({
    mutationFn: (senderId: string) => friendService.rejectFriendRequest(senderId),
    onSuccess: () => {
      toast.success('Đã từ chối lời mời kết bạn')
    },
    onError: () => {
      toast.error('Từ chối lời mời thất bại')
    }
  })
}

export const useCancelFriendRequestMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: friendService.cancelFriendRequest,
    onSuccess: () => {
      toast.success('Đã hủy lời mời kết bạn')
      queryClient.invalidateQueries({ queryKey: ['FRIEND_SUGGESTIONS'] })
    },
    onError: () => {
      toast.error('Hủy lời mời thất bại!')
    }
  })
}

export const useRemoveFriendMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendId: string) => friendService.removeFriend(friendId),
    onSuccess: () => {
      toast.success('Đã hủy kết bạn')
      queryClient.invalidateQueries({ queryKey: ['FRIENDS'] })
    },
    onError: () => {
      toast.error('Hủy kết bạn thất bại!')
    }
  })
}
