'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { useSocket } from '~/hooks/use-socket'
import SOCKET_EVENTS from '~/constants/socket-events'

export default function GroupEventsListener() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  const router = useRouter()

  useEffect(() => {
    if (!socket) return

    // Lắng nghe sự kiện OWNERSHIP_TRANSFERRED
    const handleOwnershipTransferred = (data: any) => {
      console.log('OWNERSHIP_TRANSFERRED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })
      }

      // Hiển thị thông báo nếu người dùng là owner mới
      if (data.newOwnerId === currentUserId) {
        toast.success('Bạn đã trở thành chủ nhóm mới')
      }
    }

    // Lắng nghe sự kiện MEMBER_LEFT
    const handleMemberLeft = (data: any) => {
      console.log('MEMBER_LEFT event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })
      }
    }

    // Lắng nghe sự kiện MEMBER_REMOVED
    const handleMemberRemoved = (data: any) => {
      console.log('MEMBER_REMOVED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })
      }

      // Hiển thị thông báo nếu người dùng bị xóa
      if (data.userId === currentUserId) {
        toast.error('Bạn đã bị xóa khỏi nhóm')
      }
    }

    // Lắng nghe sự kiện GROUP_DISBANDED
    const handleGroupDisbanded = (data: any) => {
      console.log('GROUP_DISBANDED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Nếu đang ở trong chat bị giải tán, chuyển hướng về trang messages
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        toast.info('Nhóm đã bị giải tán bởi chủ nhóm')
        router.push('/messages')
      } else {
        // Hiển thị thông báo
        toast.info(`Nhóm "${data.conversationName || 'Nhóm chat'}" đã bị giải tán`)
      }
    }

    // Đăng ký lắng nghe các sự kiện
    socket.on(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED, handleOwnershipTransferred)
    socket.on(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft)
    socket.on(SOCKET_EVENTS.MEMBER_REMOVED, handleMemberRemoved)
    socket.on(SOCKET_EVENTS.GROUP_DISBANDED, handleGroupDisbanded)

    // Cleanup khi component unmount
    return () => {
      socket.off(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED, handleOwnershipTransferred)
      socket.off(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft)
      socket.off(SOCKET_EVENTS.MEMBER_REMOVED, handleMemberRemoved)
      socket.off(SOCKET_EVENTS.GROUP_DISBANDED, handleGroupDisbanded)
    }
  }, [socket, pathname, currentUserId])

  return null
}
