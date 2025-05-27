'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'

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
      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        // Cập nhật danh sách tin nhắn
        queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })

        // Cập nhật danh sách thành viên
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })

        // Thêm tin nhắn hệ thống vào cache nếu có
        if (data.message) {
          queryClient.setQueryData(['MESSAGES', data.conversationId], (oldData: any) => {
            if (!oldData) return oldData

            // Thêm tin nhắn hệ thống vào trang đầu tiên
            const updatedPages = [...oldData.pages]
            if (updatedPages.length > 0 && updatedPages[0].messages) {
              updatedPages[0].messages = [data.message, ...updatedPages[0].messages]
            }

            return {
              ...oldData,
              pages: updatedPages
            }
          })
        }
      }

      // Hiển thị thông báo nếu người dùng bị xóa
      if (data.removedUserId === currentUserId) {
        toast.error('Bạn đã bị xóa khỏi nhóm')
        // Chuyển hướng về trang messages nếu đang ở trong chat bị xóa
        if (pathname?.includes(`/messages/${data.conversationId}`)) {
          router.push('/messages')
        }
      } else {
        // Hiển thị thông báo cho các thành viên khác
        toast.info(`${data.message?.content || 'Một thành viên đã bị xóa khỏi nhóm'}`)
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

    // Thêm listener cho sự kiện MEMBER_JOINED
    const handleMemberJoined = (data: any) => {
      console.log('MEMBER_JOINED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        // Cập nhật danh sách tin nhắn với tin nhắn hệ thống mới
        queryClient.setQueryData(['MESSAGES', data.conversationId], (oldData: any) => {
          if (!oldData) return oldData

          // Thêm tin nhắn hệ thống vào trang đầu tiên
          const firstPage = oldData.pages[0]
          if (firstPage && firstPage.messages) {
            return {
              ...oldData,
              pages: [
                {
                  ...firstPage,
                  messages: [data.message, ...firstPage.messages]
                },
                ...oldData.pages.slice(1)
              ]
            }
          }
          return oldData
        })

        // Cập nhật danh sách thành viên
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })
      }
    }

    // Thêm listener cho sự kiện JOIN_REQUEST_RECEIVED
    const handleJoinRequestReceived = (data: any) => {
      console.log('JOIN_REQUEST_RECEIVED event received:', data)

      // Cập nhật danh sách yêu cầu tham gia
      queryClient.invalidateQueries({ queryKey: ['JOIN_REQUESTS', data.conversationId] })
    }

    // Lắng nghe sự kiện MEMBERS_ADDED
    const handleMembersAdded = (data: any) => {
      console.log('MEMBERS_ADDED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        // Cập nhật danh sách thành viên
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })

        // Cập nhật danh sách bạn bè để thêm vào nhóm
        queryClient.invalidateQueries({ queryKey: ['FRIENDS'] })

        // Thêm tin nhắn hệ thống vào cache nếu có
        if (data.message) {
          // Cập nhật danh sách tin nhắn
          queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })

          // Thêm tin nhắn hệ thống vào cache
          queryClient.setQueryData(['MESSAGES', data.conversationId], (oldData: any) => {
            if (!oldData) return oldData

            // Thêm tin nhắn hệ thống vào trang đầu tiên
            const updatedPages = [...oldData.pages]
            if (updatedPages.length > 0 && updatedPages[0].messages) {
              // Kiểm tra xem tin nhắn đã tồn tại chưa
              const messageExists = updatedPages[0].messages.some((msg: any) => msg._id === data.message._id)

              if (!messageExists) {
                updatedPages[0].messages = [data.message, ...updatedPages[0].messages]
              }
            }

            return {
              ...oldData,
              pages: updatedPages
            }
          })
        }
      }

      // Hiển thị thông báo
      if (data.newMembers?.includes(currentUserId)) {
        toast.success('Bạn đã được thêm vào nhóm')
      } else {
        toast.info(`${data.message?.content || 'Có thành viên mới được thêm vào nhóm'}`)
      }
    }

    // Lắng nghe sự kiện MEMBER_ROLE_UPDATED
    const handleMemberRoleUpdated = (data: any) => {
      console.log('MEMBER_ROLE_UPDATED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })

        // Thêm tin nhắn hệ thống vào cache nếu có
        if (data.message) {
          queryClient.setQueryData(['MESSAGES', data.conversationId], (oldData: any) => {
            if (!oldData) return oldData

            // Thêm tin nhắn hệ thống vào trang đầu tiên
            const updatedPages = [...oldData.pages]
            if (updatedPages.length > 0 && updatedPages[0].messages) {
              updatedPages[0].messages = [data.message, ...updatedPages[0].messages]
            }

            return {
              ...oldData,
              pages: updatedPages
            }
          })
        }
      }
    }

    // Thêm listener cho sự kiện GROUP_UPDATED
    const handleGroupUpdated = (data: any) => {
      console.log('GROUP_UPDATED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        // Nếu có tin nhắn hệ thống, thêm vào danh sách tin nhắn
        if (data.message) {
          queryClient.setQueryData(['MESSAGES', data.conversationId], (oldData: any) => {
            if (!oldData) return oldData

            // Thêm tin nhắn hệ thống vào trang đầu tiên
            const firstPage = oldData.pages[0]
            if (firstPage && firstPage.messages) {
              return {
                ...oldData,
                pages: [
                  {
                    ...firstPage,
                    messages: [data.message, ...firstPage.messages]
                  },
                  ...oldData.pages.slice(1)
                ]
              }
            }
            return oldData
          })
        } else {
          // Nếu không có tin nhắn, chỉ cần invalidate để lấy dữ liệu mới
          queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })
        }
      }

      // Chỉ hiển thị thông báo nếu KHÔNG phải người dùng hiện tại cập nhật
      if (data.updatedBy !== currentUserId && data.message?.content) {
        toast.info(data.message.content)
      }
    }

    // Lắng nghe sự kiện JOIN_REQUEST_APPROVED
    const handleJoinRequestApproved = (data: any) => {
      console.log('JOIN_REQUEST_APPROVED event received:', data)

      // Cập nhật danh sách chat
      queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'] })

      // Cập nhật thông tin chat hiện tại nếu đang ở trong chat này
      if (pathname?.includes(`/messages/${data.conversationId}`)) {
        // Cập nhật danh sách tin nhắn với tin nhắn hệ thống mới
        if (data.message) {
          console.log('Adding system message to chat:', data.message)

          queryClient.setQueryData(['MESSAGES', data.conversationId], (oldData: any) => {
            if (!oldData) return oldData

            // Thêm tin nhắn hệ thống vào trang đầu tiên
            const firstPage = oldData.pages[0]
            if (firstPage && firstPage.messages) {
              // Kiểm tra xem tin nhắn đã tồn tại chưa
              const messageExists = firstPage.messages.some((msg: any) => msg._id === data.message._id)

              if (!messageExists) {
                return {
                  ...oldData,
                  pages: [
                    {
                      ...firstPage,
                      messages: [data.message, ...firstPage.messages]
                    },
                    ...oldData.pages.slice(1)
                  ]
                }
              }
            }
            return oldData
          })
        } else {
          // Nếu không có tin nhắn, chỉ cần invalidate để lấy dữ liệu mới
          queryClient.invalidateQueries({ queryKey: ['MESSAGES', data.conversationId] })
        }

        // Cập nhật danh sách thành viên
        queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', data.conversationId] })
      }

      // Hiển thị thông báo nếu người dùng là người được phê duyệt
      if (data.userId === currentUserId) {
        toast.success('Yêu cầu tham gia của bạn đã được chấp nhận')

        // Nếu không đang ở trong chat, chuyển hướng đến chat
        if (!pathname?.includes(`/messages/${data.conversationId}`)) {
          // Có thể thêm logic chuyển hướng ở đây nếu cần
        }
      }
    }

    // Đăng ký lắng nghe các sự kiện
    socket.on(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED, handleOwnershipTransferred)
    socket.on(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft)
    socket.on(SOCKET_EVENTS.MEMBER_REMOVED, handleMemberRemoved)
    socket.on(SOCKET_EVENTS.GROUP_DISBANDED, handleGroupDisbanded)
    socket.on(SOCKET_EVENTS.MEMBER_JOINED, handleMemberJoined)
    socket.on(SOCKET_EVENTS.JOIN_REQUEST_RECEIVED, handleJoinRequestReceived)
    socket.on(SOCKET_EVENTS.MEMBERS_ADDED, handleMembersAdded)
    socket.on(SOCKET_EVENTS.MEMBER_ROLE_UPDATED, handleMemberRoleUpdated)
    socket.on(SOCKET_EVENTS.GROUP_UPDATED, handleGroupUpdated)
    socket.on(SOCKET_EVENTS.JOIN_REQUEST_APPROVED, handleJoinRequestApproved)

    // Cleanup khi component unmount
    return () => {
      socket.off(SOCKET_EVENTS.OWNERSHIP_TRANSFERRED, handleOwnershipTransferred)
      socket.off(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft)
      socket.off(SOCKET_EVENTS.MEMBER_REMOVED, handleMemberRemoved)
      socket.off(SOCKET_EVENTS.GROUP_DISBANDED, handleGroupDisbanded)
      socket.off(SOCKET_EVENTS.MEMBER_JOINED, handleMemberJoined)
      socket.off(SOCKET_EVENTS.JOIN_REQUEST_RECEIVED, handleJoinRequestReceived)
      socket.off(SOCKET_EVENTS.MEMBERS_ADDED, handleMembersAdded)
      socket.off(SOCKET_EVENTS.MEMBER_ROLE_UPDATED, handleMemberRoleUpdated)
      socket.off(SOCKET_EVENTS.GROUP_UPDATED, handleGroupUpdated)
      socket.off(SOCKET_EVENTS.JOIN_REQUEST_APPROVED, handleJoinRequestApproved)
    }
  }, [socket, currentUserId, pathname])

  return null
}
