import { use } from 'react'
import { SocketContext } from '~/providers/socket-provider'

function useSocket() {
  const socket = use(SocketContext)
  if (!socket) throw new Error('useSocketContext must be used within a SocketProvider')
  return socket
}

export default useSocket
