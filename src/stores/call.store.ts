import { create } from 'zustand'
import { CALL_TYPE } from '~/constants/enums'

interface CallParams {
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  chatId: string
  callType: CALL_TYPE
}

interface IncomingCallParams {
  callerId: string
  callerName: string
  callerAvatar?: string
  chatId: string
  callType: CALL_TYPE
}

interface CallState {
  outgoingCall: CallParams | null
  incomingCall: IncomingCallParams | null
  startCall: (params: CallParams) => void
  setIncomingCall: (params: IncomingCallParams) => void
  endCall: () => void
}

export const useCallStore = create<CallState>((set) => ({
  outgoingCall: null,
  incomingCall: null,

  startCall: (params) => {
    console.log('Call store: Starting call with params:', params)
    set({ outgoingCall: params, incomingCall: null })
  },

  setIncomingCall: (params) => {
    console.log('Call store: Setting incoming call:', params)
    set({ incomingCall: params, outgoingCall: null })
  },

  endCall: () => {
    console.log('Call store: Ending call - RESET STATE')
    // Force reset state
    set({ outgoingCall: null, incomingCall: null })
  }
}))
