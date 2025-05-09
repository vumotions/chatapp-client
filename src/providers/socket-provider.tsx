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

    const socketUrl = nextEnv.NEXT_PUBLIC_SERVER_URL
    console.log('Connecting to socket at URL:', socketUrl)

    const socketInstance = io(socketUrl, {
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

  useEffect(() => {
    if (!socket) return;
    
    // Lắng nghe tất cả các sự kiện
    const onAnyEvent = (eventName: string, ...args: any[]) => {
      console.log(`Socket event received: ${eventName}`, args);
    };
    
    socket.onAny(onAnyEvent);
    
    // Lắng nghe sự kiện MESSAGE_DELETED cụ thể
    socket.on('MESSAGE_DELETED', (data) => {
      console.log('MESSAGE_DELETED event received in provider:', data);
    });
    
    // Lắng nghe sự kiện MESSAGE_UPDATED cụ thể
    socket.on('MESSAGE_UPDATED', (data) => {
      console.log('MESSAGE_UPDATED event received in provider:', data);
    });
    
    return () => {
      socket.offAny(onAnyEvent);
      socket.off('MESSAGE_DELETED');
      socket.off('MESSAGE_UPDATED');
    };
  }, [socket]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}

export default SocketProvider
