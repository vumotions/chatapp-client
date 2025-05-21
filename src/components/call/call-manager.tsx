'use client'

import { AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'
import { useCallStore } from '~/stores/call.store'
import { CallFrame } from './call-frame'

export function CallManager() {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const { outgoingCall, incomingCall, setIncomingCall, endCall } = useCallStore()

  console.log('CallManager render - incomingCall:', incomingCall, 'outgoingCall:', outgoingCall)

  // Xử lý từ chối cuộc gọi đến
  const handleRejectIncomingCall = () => {
    console.log('REJECTING INCOMING CALL')
    if (!incomingCall) return

    socket?.emit(SOCKET_EVENTS.CALL_REJECTED, {
      callerId: incomingCall.callerId,
      chatId: incomingCall.chatId
    })

    endCall()
  }

  // Xử lý kết thúc cuộc gọi đi
  const handleEndOutgoingCall = () => {
    console.log('ENDING OUTGOING CALL')
    if (!outgoingCall) return

    socket?.emit(SOCKET_EVENTS.CALL_ENDED, {
      recipientId: outgoingCall.recipientId,
      chatId: outgoingCall.chatId
    })

    endCall()
  }

  return (
    <AnimatePresence mode='wait'>
      {incomingCall && (
        <CallFrame
          key='incoming-call'
          chatId={incomingCall.chatId}
          recipientId={incomingCall.callerId}
          recipientName={incomingCall.callerName}
          recipientAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          isInitiator={false}
          onClose={handleRejectIncomingCall}
        />
      )}

      {outgoingCall && (
        <CallFrame
          key='outgoing-call'
          chatId={outgoingCall.chatId}
          recipientId={outgoingCall.recipientId}
          recipientName={outgoingCall.recipientName}
          recipientAvatar={outgoingCall.recipientAvatar}
          callType={outgoingCall.callType}
          isInitiator={true}
          onClose={handleEndOutgoingCall}
        />
      )}
    </AnimatePresence>
  )
}
