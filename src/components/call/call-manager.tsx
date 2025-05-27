'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'
import { useCallStore } from '~/stores/call.store'
import { CallFrame } from './call-frame'
// import { CallFrame2 } from './call-frame2'
import { useEffect } from 'react'
import { CALL_TYPE } from '~/constants/enums'

export function CallManager() {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const { outgoingCall, incomingCall, setIncomingCall, endCall } = useCallStore()

  // Lắng nghe sự kiện cuộc gọi đến
  useEffect(() => {
    if (!socket || !session) return

    const handleIncomingCall = (data: {
      callerId: string
      callerName: string
      callerAvatar?: string
      chatId: string
      callType: CALL_TYPE
    }) => {
      console.log('Incoming call received:', data)
      // Cập nhật store với thông tin cuộc gọi đến
      setIncomingCall(data)
    }

    socket.on(SOCKET_EVENTS.INCOMING_CALL, handleIncomingCall)

    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_CALL, handleIncomingCall)
    }
  }, [socket, session, setIncomingCall])

  // Xử lý đóng cuộc gọi
  const handleCloseCall = () => {
    endCall()
  }

  return (
    <AnimatePresence>
      {/* Cuộc gọi đi */}
      {outgoingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          <CallFrame
            chatId={outgoingCall.chatId}
            recipientId={outgoingCall.recipientId}
            recipientName={outgoingCall.recipientName}
            recipientAvatar={outgoingCall.recipientAvatar || ''}
            callType={outgoingCall.callType}
            isInitiator={true}
            onClose={handleCloseCall}
          />
        </motion.div>
      )}

      {/* Cuộc gọi đến */}
      {incomingCall && !outgoingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          <CallFrame
            chatId={incomingCall.chatId}
            recipientId={incomingCall.callerId}
            recipientName={incomingCall.callerName}
            recipientAvatar={incomingCall.callerAvatar || ''}
            callType={incomingCall.callType}
            isInitiator={false}
            onClose={handleCloseCall}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
