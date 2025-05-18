import { useContext } from 'react'
import { SocketContext } from '~/providers/socket-provider'

export function useSocket() {
  const socket = useContext(SocketContext)
  if (!socket) throw new Error('useSocketContext must be used within a SocketProvider')
  return socket
}
