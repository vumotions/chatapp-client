import { create } from 'zustand'
import { Socket } from 'socket.io-client'
interface UseSocketStore {
  socket: Socket | null
  connected: boolean
  setSocket: (socketInstance: Socket) => void
  setConnected: (status: boolean) => void
}

const useSocketStore = create<UseSocketStore>((set) => ({
  socket: null,
  connected: false,
  setSocket: (socketInstance) => set({ socket: socketInstance }),
  setConnected: (status) => set({ connected: status })
}))

export default useSocketStore
