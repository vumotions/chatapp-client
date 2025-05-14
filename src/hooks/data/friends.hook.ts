import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import friendService from '~/services/friend.service'

// Gộp useFriendsQuery và useFriendsListQuery thành một hook duy nhất
export const useFriendsQuery = (search = '') => {
  const { data: session } = useSession()
  return useQuery({
    queryKey: ['FRIENDS', search],
    queryFn: ({ queryKey }) => {
      // queryKey[1] chứa giá trị search từ queryKey
      const searchTerm = queryKey[1] as string
      return friendService.getFriendsList(searchTerm)
    },
    select: (res) => res.data.data,
    enabled: !!session,
    staleTime: 5 * 60 * 1000 // 5 phút
  })
}

// Giữ lại alias này để tương thích ngược với code cũ
// Trong tương lai có thể xóa và sử dụng useFriendsQuery trực tiếp
export const useFriendsListQuery = useFriendsQuery

export const useFriendSuggestionsQuery = (page = 1, limit = 10) => {
  const { data: session } = useSession()
  return useQuery({
    queryKey: ['FRIEND_SUGGESTIONS', page, limit],
    queryFn: () => friendService.getFriendSuggestions(page, limit),
    select: (res) => res.data.data,
    enabled: !!session
  })
}

export const useSendFriendRequestMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => friendService.sendFriendRequest(userId),
    onSuccess: () => {
      toast.success('Đã gửi lời mời kết bạn')
    },
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
      queryClient.invalidateQueries({ queryKey: ['FRIENDS'] })
      queryClient.invalidateQueries({ queryKey: ['FRIEND_SUGGESTIONS'] })
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

// Thêm hook mới để lấy bạn bè theo username
export const useFriendsByUsername = (username: string) => {
  return useQuery({
    queryKey: ['FRIENDS_BY_USERNAME', username],
    queryFn: () => friendService.getFriendsByUsername(username),
    select: (res) => res.data.data,
    enabled: !!username
  })
}

// Add the useFriendStatus hook
export const useFriendStatus = (userId?: string, options = {} as any) => {
  return useQuery({
    queryKey: ['FRIEND_STATUS', userId],
    queryFn: () => friendService.getFriendStatus(userId as string),
    select: (res) => res.data.data,
    enabled: !!userId && options.enabled !== false
  })
}

// Hook để lấy danh sách bạn bè với roles trong nhóm chat
export const useFriendsWithRolesQuery = (conversationId?: string) => {
  const { data: session } = useSession()
  return useQuery({
    queryKey: ['FRIENDS_WITH_ROLES', conversationId],
    queryFn: () => friendService.getFriendsWithRoles(conversationId as string),
    select: (res) => res.data.data,
    enabled: !!session && !!conversationId,
    staleTime: 1 * 60 * 1000 // 1 phút
  })
}
