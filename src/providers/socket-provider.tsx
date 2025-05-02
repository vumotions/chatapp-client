'use client'

import { useSession } from 'next-auth/react'
import { createContext, ReactNode, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import nextEnv from '~/config/next-env'

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
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return

    const socketInstance = io(nextEnv.NEXT_PUBLIC_SERVER_URL, {
      auth: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    setSocket(socketInstance)

    socketInstance.on('connect', () => toast.success('Connected: ' + socketInstance.id))
    socketInstance.on('connect_error', (error) => toast.error(error?.message))

    return () => {
      socketInstance.disconnect()
    }
  }, [session])

  return <SocketContext value={{ socket }}>{children}</SocketContext>
}

export default SocketProvider
