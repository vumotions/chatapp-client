'use client'

import { CALL_TYPE } from '~/constants/enums'
import { CallFrame } from './call-frame'

interface CallOverlayProps {
  isAudioCallActive: boolean
  isVideoCallActive: boolean
  chatId: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  onClose: () => void
}

export function CallOverlay({
  isAudioCallActive,
  isVideoCallActive,
  chatId,
  recipientId,
  recipientName,
  recipientAvatar,
  onClose
}: CallOverlayProps) {
  if (!isAudioCallActive && !isVideoCallActive) return null

  return (
    <div className='fixed inset-0 z-50'>
      {isAudioCallActive && (
        <CallFrame
          chatId={chatId}
          recipientId={recipientId}
          recipientName={recipientName}
          recipientAvatar={recipientAvatar}
          callType={CALL_TYPE.AUDIO}
          isInitiator={true}
          onClose={onClose}
        />
      )}

      {isVideoCallActive && (
        <CallFrame
          chatId={chatId}
          recipientId={recipientId}
          recipientName={recipientName}
          recipientAvatar={recipientAvatar}
          callType={CALL_TYPE.VIDEO}
          isInitiator={true}
          onClose={onClose}
        />
      )}
    </div>
  )
}
