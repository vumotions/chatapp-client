'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getSession } from 'next-auth/react'
import nextEnv from '~/config/next-env'

// Định nghĩa các sự kiện socket
export const SOCKET_EVENTS = {
  USER_ONLINE: 'USER_ONLINE',
  USER_OFFLINE: 'USER_OFFLINE',
  CHECK_ONLINE: 'CHECK_ONLINE',
  TYPING: 'TYPING',
  SEND_MESSAGE: 'SEND_MESSAGE',
  RECEIVE_MESSAGE: 'RECEIVE_MESSAGE',
  MESSAGE_REACTION_UPDATED: 'MESSAGE_REACTION_UPDATED',
  NOTIFICATION_NEW: 'NOTIFICATION_NEW',
  
  // Thêm các sự kiện mới cho comment
  NEW_COMMENT: 'NEW_COMMENT',
  NEW_REPLY: 'NEW_REPLY',
  JOIN_POST_ROOM: 'JOIN_POST_ROOM',
  LEAVE_POST_ROOM: 'LEAVE_POST_ROOM',
  JOIN_COMMENT_ROOM: 'JOIN_COMMENT_ROOM',
  LEAVE_COMMENT_ROOM: 'LEAVE_COMMENT_ROOM'
}

type SocketContextType = {
  socket: Socket | null
  isConnected: boolean
}

// Export SocketContext để có thể import từ các file khác
export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
})

// Export hook để sử dụng socket trong các component
export const useSocket = () => useContext(SocketContext)

function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const initializeSocket = async () => {
      const session = await getSession()
      if (!session?.accessToken) return

      const socketInstance = io(nextEnv.NEXT_PUBLIC_SERVER_URL, {
        auth: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })

      socketInstance.on('connect', () => {
        console.log('Socket connected')
        setIsConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected')
        setIsConnected(false)
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }

    initializeSocket()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export default SocketProvider
