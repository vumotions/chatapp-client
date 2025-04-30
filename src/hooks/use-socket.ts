import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import nextEnv from '~/config/env'
import useSocketStore from '~/stores/socket.store'

export const useSocket = (): Socket | null => {
  const { socket, setSocket, setConnected } = useSocketStore()

  useEffect(() => {
    if (!socket) {
      const socketInstance = io(nextEnv.NEXT_PUBLIC_SERVER_URL, {
        transports: ['websocket'],
        auth: {
          Authorization: `Bearer ${'accessToken'}`
        }
      })

      socketInstance.on('connect', () => {
        console.log('Connected to socket server')
        setConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from socket server')
        setConnected(false)
      })

      setSocket(socketInstance)
    }

    return () => {
      if (socket) {
        socket.disconnect()
        setConnected(false)
      }
    }
  }, [socket, setSocket, setConnected])

  return socket
}
