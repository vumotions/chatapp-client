'use client'

import { useSession } from 'next-auth/react'
import { createContext, ReactNode, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import nextEnv from '~/config/next-env'
import SOCKET_EVENTS from '~/constants/socket-events'

type Props = {
  children: ReactNode
}

type SocketContextType = {
  socket: Socket | null
}

export const SocketContext = createContext<SocketContextType>({
  socket: null
})

function SocketProvider({ children }: Props) {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const accessToken = session?.accessToken
    if (!accessToken) return

    const socketInstance = io(nextEnv.NEXT_PUBLIC_SERVER_URL, {
      auth: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    setSocket(socketInstance)

    // Xử lý các sự kiện socket
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id)
    })
    
    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error(`Lỗi kết nối: ${error?.message || 'Không thể kết nối đến server'}`)
    })

    // Lắng nghe sự kiện lỗi
    socketInstance.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('Socket error:', error)
      toast.error(`Lỗi: ${error?.message || 'Đã xảy ra lỗi'}`)
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [session?.accessToken])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}

export default SocketProvider
