import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import conversationsService from '~/services/conversations.service'
import { useRouter } from '~/i18n/navigation'

// Hook để cập nhật thông tin nhóm
export const useUpdateGroupMutation = (conversationId: string, onUpdate?: () => void) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => 
      conversationsService.updateGroupConversation(conversationId, data),
    onSuccess: () => {
      toast.success('Cập nhật nhóm thành công')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      if (onUpdate) onUpdate()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật nhóm')
    }
  })
}

// Hook để tạo link mời
export const useGenerateInviteLinkMutation = (conversationId: string, onSuccess?: (link: string) => void) => {
  return useMutation({
    mutationFn: () => {
      console.log('Generating invite link for conversation:', conversationId);
      return conversationsService.generateInviteLink(conversationId);
    },
    onSuccess: (response) => {
      console.log('Generate invite link success:', response);
      // Đảm bảo cấu trúc response đúng
      const inviteLink = response.data?.inviteLink;
      if (inviteLink && onSuccess) {
        onSuccess(inviteLink);
      }
      toast.success('Đã tạo link mời mới');
    },
    onError: (error: any) => {
      console.error('Generate invite link error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo link mời');
    }
  });
}

// Hook để rời khỏi nhóm
export const useLeaveGroupMutation = (conversationId: string) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: () => conversationsService.leaveGroupConversation(conversationId),
    onSuccess: () => {
      toast.success('Đã rời khỏi nhóm')
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      router.push('/messages')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi rời nhóm')
    }
  })
}

// Hook để xóa thành viên khỏi nhóm
export const useRemoveGroupMemberMutation = (conversationId: string) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (userId: string) => 
      conversationsService.removeGroupMember(conversationId, userId),
    onSuccess: () => {
      toast.success('Đã xóa thành viên khỏi nhóm')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', conversationId] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa thành viên')
    }
  })
}

// Hook để cập nhật vai trò thành viên
export const useUpdateMemberRoleMutation = (conversationId: string) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { 
      userId: string; 
      role: string; 
      permissions: Record<string, boolean>; 
      customTitle?: string 
    }) => {
      console.log('Updating member role:', { conversationId, ...data })
      return conversationsService.updateGroupMemberRole(conversationId, data)
    },
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò thành viên')
      queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
      queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', conversationId] })
    },
    onError: (error: any) => {
      console.error('Update member role error:', error)
      console.error('Error response:', error.response?.data)
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật vai trò')
    }
  })
}

// Hook để lấy thông tin nhóm qua link mời
export const useGetGroupByInviteLinkQuery = (inviteLink: string) => {
  return useQuery({
    queryKey: ['GROUP_BY_INVITE_LINK', inviteLink],
    queryFn: () => conversationsService.getGroupByInviteLink(inviteLink),
    select: (response) => response,
    enabled: !!inviteLink,
    retry: false
  })
}

// Hook để tham gia nhóm qua link mời
export const useJoinGroupByInviteLinkMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (inviteLink: string) => 
      conversationsService.joinGroupByInviteLink(inviteLink),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tham gia nhóm')
    }
  })
}


