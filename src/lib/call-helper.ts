import { CALL_TYPE } from '~/constants/enums'
import { useCallStore } from '~/stores/call.store'

export function startCall(params: {
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  chatId: string
  callType: CALL_TYPE
}) {
  console.log('Starting call with data:', params)

  // Sử dụng store để bắt đầu cuộc gọi
  useCallStore.getState().startCall(params)

  console.log('Call started via Zustand store')
}

export function endCurrentCall() {
  console.log('Ending current call')
  useCallStore.getState().endCall()
}

