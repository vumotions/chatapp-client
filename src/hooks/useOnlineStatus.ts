import { useEffect, useState } from 'react'
import { useSocket } from './use-socket'

export function useOnlineStatus(userId: string | undefined) {
  const { socket } = useSocket()
  const [isOnline, setIsOnline] = useState(false)
  const [lastActive, setLastActive] = useState<string | null>(null)

  useEffect(() => {
    if (!socket || !userId) return

    // Kiểm tra trạng thái online ban đầu
    const checkOnlineStatus = () => {
      socket.emit('CHECK_ONLINE', userId, (online: boolean, lastActiveTime: string | null) => {
        setIsOnline(online)
        if (lastActiveTime) setLastActive(lastActiveTime)
      })
    }

    // Kiểm tra ngay khi hook được gọi
    checkOnlineStatus()

    // Lắng nghe sự kiện người dùng online
    const handleUserOnline = (onlineUserId: string) => {
      if (onlineUserId === userId) {
        setIsOnline(true)
      }
    }

    // Lắng nghe sự kiện người dùng offline
    const handleUserOffline = (offlineUserId: string, lastActiveTime: string) => {
      if (offlineUserId === userId) {
        setIsOnline(false)
        setLastActive(lastActiveTime)
      }
    }

    // Đăng ký lắng nghe các sự kiện
    socket.on('USER_ONLINE', handleUserOnline)
    socket.on('USER_OFFLINE', handleUserOffline)

    // Thiết lập interval để kiểm tra định kỳ
    const intervalId = setInterval(checkOnlineStatus, 30000) // 30 giây

    // Hủy đăng ký khi component unmount
    return () => {
      socket.off('USER_ONLINE', handleUserOnline)
      socket.off('USER_OFFLINE', handleUserOffline)
      clearInterval(intervalId)
    }
  }, [socket, userId])

  return { isOnline, lastActive }
}

export function useGroupOnlineStatus(userIds: string[] = []) {
  const { socket } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!socket || userIds.length === 0) return

    // Kiểm tra trạng thái online ban đầu cho tất cả người dùng
    const checkOnlineStatus = () => {
      userIds.forEach((userId) => {
        socket.emit('CHECK_ONLINE', userId, (isUserOnline: boolean) => {
          if (isUserOnline) {
            setOnlineUsers((prev) => new Set([...prev, userId]))
          }
        })
      })
    }

    // Kiểm tra ngay khi hook được gọi
    checkOnlineStatus()

    // Lắng nghe sự kiện người dùng online
    const handleUserOnline = (userId: string) => {
      if (userIds.includes(userId)) {
        setOnlineUsers((prev) => new Set([...prev, userId]))
      }
    }

    // Lắng nghe sự kiện người dùng offline
    const handleUserOffline = (userId: string) => {
      if (userIds.includes(userId)) {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      }
    }

    // Đăng ký lắng nghe các sự kiện
    socket.on('USER_ONLINE', handleUserOnline)
    socket.on('USER_OFFLINE', handleUserOffline)

    // Thiết lập interval để kiểm tra định kỳ
    const intervalId = setInterval(checkOnlineStatus, 30000) // 30 giây

    // Hủy đăng ký khi component unmount
    return () => {
      socket.off('USER_ONLINE', handleUserOnline)
      socket.off('USER_OFFLINE', handleUserOffline)
      clearInterval(intervalId)
    }
  }, [socket, userIds])

  return {
    onlineUsers,
    onlineCount: onlineUsers.size,
    isUserOnline: (userId: string) => onlineUsers.has(userId)
  }
}
