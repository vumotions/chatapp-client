'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'
import { useCallStore } from '~/stores/call.store'
import { CallFrame } from './call-frame'
// import { CallFrame2 } from './call-frame2'
import { useEffect, useState } from 'react'
import { CALL_TYPE } from '~/constants/enums'
import { toast } from 'sonner'

export function CallManager() {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const { outgoingCall, incomingCall, setIncomingCall, endCall } = useCallStore()
  const [ringtoneAudio, setRingtoneAudio] = useState<HTMLAudioElement | null>(null)

  // Tạo audio element khi component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/audio/phone-dialing.mp3')
      audio.loop = true
      setRingtoneAudio(audio)
    }

    return () => {
      if (ringtoneAudio) {
        ringtoneAudio.pause()
        ringtoneAudio.src = ''
      }
    }
  }, [])

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
      try {
        if (ringtoneAudio) {
          const playPromise = ringtoneAudio.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log('Âm thanh cuộc gọi đã phát thành công'))
              .catch((err) => {
                console.error('Không thể phát âm thanh cuộc gọi:', err)
                // Hiển thị toast để người dùng biết có cuộc gọi đến và có thể tương tác
                toast(`Cuộc gọi đến từ ${data.callerName}`, {
                  duration: 10000,
                  action: {
                    label: 'Bật âm thanh',
                    onClick: () => {
                      const manualAudio = new Audio('/audio/phone-dialing.mp3')
                      manualAudio.loop = true
                      manualAudio
                        .play()
                        .then(() => {
                          // Thay thế audio hiện tại bằng audio mới đã được phát
                          if (ringtoneAudio) {
                            ringtoneAudio.pause()
                          }
                          setRingtoneAudio(manualAudio)
                        })
                        .catch((e) => console.error('Vẫn không thể phát âm thanh:', e))
                    }
                  }
                })
              })
          }
        }
      } catch (error) {
        console.error('Lỗi khi tạo đối tượng Audio:', error)
      }
    }

    socket.on(SOCKET_EVENTS.INCOMING_CALL, handleIncomingCall)

    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_CALL, handleIncomingCall)
      // Dừng âm thanh khi unmount
      if (ringtoneAudio) {
        ringtoneAudio.pause()
      }
    }
  }, [socket, session, setIncomingCall, ringtoneAudio])

  // Xử lý đóng cuộc gọi
  const handleCloseCall = () => {
    // Dừng âm thanh khi cuộc gọi kết thúc
    if (ringtoneAudio) {
      ringtoneAudio.pause()
      ringtoneAudio.currentTime = 0
    }

    endCall()
  }

  // Dừng âm thanh khi không còn cuộc gọi đến
  useEffect(() => {
    if (!incomingCall && ringtoneAudio) {
      ringtoneAudio.pause()
    }
  }, [incomingCall, ringtoneAudio])

  return (
    <AnimatePresence>
      {/* Cuộc gọi đi */}
      {outgoingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-50'
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
          className='fixed inset-0 z-50'
        >
          <CallFrame
            chatId={incomingCall.chatId}
            recipientId={incomingCall.callerId}
            recipientName={incomingCall.callerName}
            recipientAvatar={incomingCall.callerAvatar || ''}
            callType={incomingCall.callType}
            isInitiator={false}
            onClose={handleCloseCall}
            // Thêm prop để dừng âm thanh khi chấp nhận cuộc gọi
            onAcceptCall={() => {
              if (ringtoneAudio) {
                ringtoneAudio.pause()
                ringtoneAudio.currentTime = 0
              }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
