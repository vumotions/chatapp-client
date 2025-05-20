'use client'

import { AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { CALL_STATUS, CALL_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'
import { useCallStore } from '~/stores/call.store'
import { CallFrame } from './call-frame'

export function CallManager() {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const { outgoingCall, incomingCall, setIncomingCall, endCall } = useCallStore()

  console.log('CallManager render - incomingCall:', incomingCall, 'outgoingCall:', outgoingCall)
  
  useEffect(() => {
    if (!socket || !session?.user) return

    // Xử lý cuộc gọi đến
    const handleIncomingCall = (data: any) => {
      console.log('Incoming call received:', data)
      // Nếu đang có cuộc gọi khác, từ chối cuộc gọi mới
      if (incomingCall || outgoingCall) {
        socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
          callerId: data.callerId,
          chatId: data.chatId
        })
        return
      }

      // Hiển thị thông báo và cập nhật state
      toast('Cuộc gọi đến', {
        description: `${data.callerName} đang gọi cho bạn`,
        action: {
          label: 'Trả lời',
          onClick: () => {
            setIncomingCall(data)
          }
        }
      })

      // Tự động cập nhật state sau khi toast hiển thị
      setIncomingCall(data)
    }

    // Xử lý khi cuộc gọi bị từ chối
    const handleCallRejected = (data: { recipientId: string; chatId: string }) => {
      console.log('Call rejected:', data)
      if (outgoingCall && outgoingCall.recipientId === data.recipientId) {
        toast.error('Cuộc gọi bị từ chối')
        endCall()
      }
    }

    // Xử lý khi cuộc gọi kết thúc
    const handleCallEnded = (data: { callerId: string; chatId: string }) => {
      console.log('Call ended:', data)
      if ((incomingCall && incomingCall.callerId === data.callerId) || 
          (outgoingCall && outgoingCall.chatId === data.chatId)) {
        toast.info('Cuộc gọi đã kết thúc')
        endCall()
      }
    }

    // Đăng ký các sự kiện socket
    socket.on(SOCKET_EVENTS.INCOMING_CALL, handleIncomingCall)
    socket.on(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
    socket.on(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)

    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_CALL, handleIncomingCall)
      socket.off(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
      socket.off(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
    }
  }, [socket, incomingCall, outgoingCall, session?.user, setIncomingCall, endCall])

  // Xử lý khi outgoingCall thay đổi
  useEffect(() => {
    if (!socket || !outgoingCall) return

    console.log('Emitting INITIATE_CALL event to server with data:', {
      recipientId: outgoingCall.recipientId,
      chatId: outgoingCall.chatId,
      callType: outgoingCall.callType
    })

    socket.emit(SOCKET_EVENTS.INITIATE_CALL, {
      recipientId: outgoingCall.recipientId,
      chatId: outgoingCall.chatId,
      callType: outgoingCall.callType
    })
  }, [socket, outgoingCall])

  // Xử lý từ chối cuộc gọi đến
  const handleRejectIncomingCall = () => {
    console.log("REJECTING INCOMING CALL")
    if (!socket || !incomingCall) return

    socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
      callerId: incomingCall.callerId,
      chatId: incomingCall.chatId
    })
    
    endCall()
  }

  // Xử lý kết thúc cuộc gọi đi
  const handleEndOutgoingCall = () => {
    console.log("ENDING OUTGOING CALL")
    if (!socket || !outgoingCall) return

    socket.emit(SOCKET_EVENTS.CALL_ENDED, {
      recipientId: outgoingCall.recipientId,
      chatId: outgoingCall.chatId
    })
    
    endCall()
  }

  return (
    <AnimatePresence mode='wait'>
      {incomingCall && (
        <CallFrame
          key="incoming-call"
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
          key="outgoing-call"
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





