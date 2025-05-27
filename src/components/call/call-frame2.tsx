'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import { CALL_STATUS, CALL_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useSocket } from '~/hooks/use-socket'

type CallFrame2Props = {
  chatId: string
  recipientId: string
  recipientName: string
  recipientAvatar: string
  callType: CALL_TYPE
  isInitiator: boolean
  onClose: () => void
}

export function CallFrame2({
  chatId,
  recipientId,
  recipientName,
  recipientAvatar,
  callType,
  isInitiator,
  onClose
}: CallFrame2Props) {
  const { socket } = useSocket()
  const { data: session } = useSession()

  // States
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(isInitiator ? CALL_STATUS.CALLING : CALL_STATUS.RINGING)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isCameraOff, setIsCameraOff] = useState<boolean>(callType === CALL_TYPE.AUDIO)
  const [remoteVideoOff, setRemoteVideoOff] = useState<boolean>(true)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const iceCandidatesBuffer = useRef<RTCIceCandidateInit[]>([])

  // Hàm tiện ích để xử lý các ICE candidates đã buffer
  const processBufferedIceCandidates = async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) return
    
    if (iceCandidatesBuffer.current && iceCandidatesBuffer.current.length > 0) {
      console.log(`Processing ${iceCandidatesBuffer.current.length} buffered ICE candidates`)
      
      for (const candidate of iceCandidatesBuffer.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          console.log('Added buffered ICE candidate successfully')
        } catch (error) {
          console.error('Error adding buffered ICE candidate:', error)
        }
      }
      
      // Xóa buffer sau khi đã xử lý
      iceCandidatesBuffer.current = []
    }
  }

  // Khởi tạo media stream
  const initializeMediaStream = async () => {
    try {
      console.log('Initializing media stream...')

      // Lấy media stream
      const constraints = {
        audio: true,
        video: callType === CALL_TYPE.VIDEO
      }

      console.log('Getting user media with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      // Hiển thị local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        console.log('Set local video source')
      }

      return stream
    } catch (error) {
      console.error('Error initializing media stream:', error)
      toast.error('Không thể truy cập camera hoặc microphone')
      throw error
    }
  }

  // Khởi tạo WebRTC
  const initializeWebRTC = async () => {
    try {
      console.log('Initializing WebRTC...')

      // Tạo peer connection với nhiều STUN servers
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      }

      // Tạo peer connection
      peerConnectionRef.current = new RTCPeerConnection(configuration)
      console.log('Created peer connection:', peerConnectionRef.current)

      // Lấy media stream nếu chưa có
      if (!localStreamRef.current) {
        await initializeMediaStream()
      }

      // Thêm tracks vào peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log('Adding track to peer connection:', track.kind)
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, localStreamRef.current as MediaStream)
          }
        })
      }

      // Xử lý ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Generated ICE candidate for', event.candidate.sdpMid)
          socket?.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
            candidate: event.candidate,
            recipientId,
            chatId
          })
        }
      }

      // Xử lý ICE connection state
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnectionRef.current?.iceConnectionState)

        if (peerConnectionRef.current?.iceConnectionState === 'failed') {
          console.log('ICE connection failed, attempting restart...')
          restartIce()
        }
      }

      // Xử lý kết nối thay đổi
      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnectionRef.current?.connectionState)

        if (peerConnectionRef.current?.connectionState === 'connected') {
          console.log('WebRTC connection established!')
          setCallStatus(CALL_STATUS.CONNECTED)
        } else if (peerConnectionRef.current?.connectionState === 'failed') {
          console.log('WebRTC connection failed')
          toast.error('Kết nối cuộc gọi bị gián đoạn')
        }
      }

      // Xử lý remote tracks - QUAN TRỌNG
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind, 'enabled:', event.track.enabled)

        if (event.streams && event.streams[0]) {
          const stream = event.streams[0]
          console.log('Received remote stream with ID:', stream.id)

          // Lưu stream vào ref
          remoteStreamRef.current = stream

          // Cập nhật video element
          if (remoteVideoRef.current) {
            console.log('Setting remote stream to video element')
            remoteVideoRef.current.srcObject = stream

            // Kiểm tra xem có video track không
            const hasVideoTracks = stream.getVideoTracks().length > 0
            const isVideoEnabled = hasVideoTracks && stream.getVideoTracks()[0].enabled
            console.log('Remote has video tracks:', hasVideoTracks, 'enabled:', isVideoEnabled)
            setRemoteVideoOff(!hasVideoTracks || !isVideoEnabled)
          }
        }
      }

      return peerConnectionRef.current
    } catch (error) {
      console.error('Error initializing WebRTC:', error)
      toast.error('Không thể khởi tạo kết nối')
      throw error
    }
  }

  // Tạo và gửi offer
  const createAndSendOffer = async () => {
    if (!peerConnectionRef.current) return
    
    try {
      console.log('Creating offer...')
      
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === CALL_TYPE.VIDEO
      }
      
      const offer = await peerConnectionRef.current.createOffer(offerOptions)
      console.log('Created offer:', offer.type)
      
      await peerConnectionRef.current.setLocalDescription(offer)
      console.log('Set local description (offer)')
      
      // Đợi một chút để đảm bảo ICE gathering hoàn tất
      // Sử dụng timeout ngắn hơn để tránh delay quá lâu
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Kiểm tra xem local description có sẵn không
      const localDescription = peerConnectionRef.current.localDescription || offer
      
      console.log('Sending SDP offer to recipient')
      socket?.emit(SOCKET_EVENTS.SDP_OFFER, {
        sdp: localDescription,
        recipientId,
        chatId
      })
    } catch (error) {
      console.error('Error creating and sending offer:', error)
    }
  }

  // Tạo và gửi answer
  const createAndSendAnswer = async () => {
    if (!peerConnectionRef.current) return

    try {
      console.log('Creating answer...')

      const answer = await peerConnectionRef.current.createAnswer()
      console.log('Created answer:', answer.type)

      await peerConnectionRef.current.setLocalDescription(answer)
      console.log('Set local description (answer)')

      console.log('Sending SDP answer to caller')
      socket?.emit(SOCKET_EVENTS.SDP_ANSWER, {
        sdp: peerConnectionRef.current.localDescription,
        recipientId,
        chatId
      })
    } catch (error) {
      console.error('Error creating and sending answer:', error)
    }
  }

  // Restart ICE
  const restartIce = async () => {
    if (!peerConnectionRef.current || !isInitiator) return

    try {
      console.log('Restarting ICE connection')

      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === CALL_TYPE.VIDEO,
        iceRestart: true
      }

      const offer = await peerConnectionRef.current.createOffer(offerOptions)
      await peerConnectionRef.current.setLocalDescription(offer)

      socket?.emit(SOCKET_EVENTS.SDP_OFFER, {
        sdp: peerConnectionRef.current.localDescription,
        recipientId,
        chatId
      })
    } catch (error) {
      console.error('Error restarting ICE:', error)
    }
  }

  // Xử lý kết thúc cuộc gọi
  const handleEndCall = () => {
    console.log('Ending call...')

    socket?.emit(SOCKET_EVENTS.CALL_ENDED, {
      chatId,
      recipientId
    })

    // Dừng tất cả media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    // Đóng peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    setCallStatus(CALL_STATUS.ENDED)
    setTimeout(onClose, 500)
  }

  // Xử lý chấp nhận cuộc gọi
  const handleAcceptCall = async () => {
    try {
      console.log('Accepting call...')

      // Thông báo cho người gọi rằng cuộc gọi đã được chấp nhận
      socket?.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        chatId,
        callerId: recipientId
      })

      // Cập nhật trạng thái
      setCallStatus(CALL_STATUS.CONNECTING)

      // Khởi tạo WebRTC
      await initializeWebRTC()

      console.log('Call accepted and WebRTC initialized')
    } catch (error) {
      console.error('Error accepting call:', error)
      toast.error('Không thể kết nối cuộc gọi')
    }
  }

  // Xử lý từ chối cuộc gọi
  const handleRejectCall = () => {
    console.log('Rejecting call...')

    socket?.emit(SOCKET_EVENTS.CALL_REJECTED, {
      chatId,
      callerId: recipientId
    })

    onClose()
  }

  // Toggle mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      console.log('Toggling microphone, current state:', isMuted)

      const newMuteState = !isMuted

      // Áp dụng trạng thái mới cho tất cả audio tracks
      localStreamRef.current.getAudioTracks().forEach((track) => {
        console.log('Setting audio track enabled:', !newMuteState)
        track.enabled = !newMuteState
      })

      // Cập nhật state
      setIsMuted(newMuteState)

      // Thông báo cho đối phương
      socket?.emit(SOCKET_EVENTS.TOGGLE_AUDIO, {
        recipientId,
        chatId,
        isMuted: newMuteState
      })

      console.log('Microphone toggled, new state:', newMuteState)
    }
  }

  // Toggle camera
  const toggleCamera = () => {
    if (localStreamRef.current && callType === CALL_TYPE.VIDEO) {
      console.log('Toggling camera, current state:', isCameraOff)

      const newCameraState = !isCameraOff

      // Áp dụng trạng thái mới cho tất cả video tracks
      localStreamRef.current.getVideoTracks().forEach((track) => {
        console.log('Setting video track enabled:', !newCameraState)
        track.enabled = !newCameraState
      })

      // Cập nhật state
      setIsCameraOff(newCameraState)

      // Thông báo cho đối phương
      socket?.emit(SOCKET_EVENTS.TOGGLE_VIDEO, {
        recipientId,
        chatId,
        isCameraOff: newCameraState
      })

      console.log('Camera toggled, new state:', newCameraState)
    }
  }

  // Xử lý SDP offer
  const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; chatId: string }) => {
    if (data.chatId !== chatId) return
    
    try {
      console.log('Received SDP offer')
      
      // Khởi tạo WebRTC nếu chưa có
      if (!peerConnectionRef.current) {
        await initializeWebRTC()
      }
      
      if (!peerConnectionRef.current) {
        console.error('Peer connection is null after initialization')
        return
      }
      
      console.log('Setting remote description (offer)')
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      
      // Xử lý các ICE candidates đã được buffer
      await processBufferedIceCandidates()
      
      // Tạo và gửi answer
      await createAndSendAnswer()
    } catch (error) {
      console.error('Error handling offer:', error)
    }
  }

  // Xử lý SDP answer
  const handleAnswer = async (data: { sdp: RTCSessionDescriptionInit; chatId: string }) => {
    if (data.chatId !== chatId || !peerConnectionRef.current) return
    
    try {
      console.log('Received SDP answer')
      console.log('Setting remote description (answer)')
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      console.log('Remote description set successfully')
      
      // Xử lý các ICE candidates đã được buffer
      await processBufferedIceCandidates()
    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  // Xử lý ICE candidate - cần đảm bảo remote description đã được thiết lập
  const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; chatId: string }) => {
    if (data.chatId !== chatId || !peerConnectionRef.current) return

    try {
      // Kiểm tra xem remote description đã được thiết lập chưa
      if (!peerConnectionRef.current.remoteDescription) {
        console.log('Remote description not set yet, buffering ICE candidate')

        // Lưu ICE candidate vào buffer để xử lý sau
        if (!iceCandidatesBuffer.current) {
          iceCandidatesBuffer.current = []
        }

        iceCandidatesBuffer.current.push(data.candidate)
        return
      }

      console.log('Adding ICE candidate directly')
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      console.log('Added ICE candidate successfully')
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
    }
  }

  // Xử lý cuộc gọi được chấp nhận
  const handleCallAccepted = async () => {
    if (isInitiator) {
      console.log('Call accepted by recipient')
      setCallStatus(CALL_STATUS.CONNECTING)
      
      try {
        // Khởi tạo WebRTC nếu chưa có
        if (!peerConnectionRef.current) {
          await initializeWebRTC()
        }
        
        // Tạo và gửi offer
        await createAndSendOffer()
      } catch (error) {
        console.error('Error handling call accepted:', error)
      }
    }
  }

  // Xử lý cuộc gọi bị từ chối
  const handleCallRejected = () => {
    if (isInitiator) {
      console.log('Call rejected by recipient')
      toast.error('Cuộc gọi đã bị từ chối')
      setCallStatus(CALL_STATUS.REJECTED)
      setTimeout(onClose, 1000)
    }
  }

  // Xử lý cuộc gọi kết thúc
  const handleCallEnded = () => {
    console.log('Call ended by other party')
    toast.info('Cuộc gọi đã kết thúc')

    // Dừng tất cả media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    // Đóng peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    setCallStatus(CALL_STATUS.ENDED)
    setTimeout(onClose, 500)
  }

  // Xử lý toggle video
  const handleToggleVideo = (data: { isCameraOff: boolean }) => {
    console.log('Remote toggled video:', data.isCameraOff)
    setRemoteVideoOff(data.isCameraOff)
  }

  // Xử lý toggle audio
  const handleToggleAudio = (data: { isMuted: boolean }) => {
    console.log('Remote toggled audio:', data.isMuted)
    // Có thể hiển thị thông báo rằng người dùng đã tắt/bật mic
  }

  // Khởi tạo cuộc gọi
  useEffect(() => {
    if (!socket) return

    const initCall = async () => {
      if (isInitiator) {
        console.log('Initiating call...')

        // Khởi tạo media stream
        await initializeMediaStream()

        // Gửi sự kiện INITIATE_CALL
        socket.emit(SOCKET_EVENTS.INITIATE_CALL, {
          chatId,
          recipientId,
          callType
        })
      }
    }

    initCall()
  }, [socket, isInitiator])

  // Đăng ký các sự kiện socket
  useEffect(() => {
    if (!socket) return

    console.log('Registering socket event handlers')

    // Đăng ký các event listeners
    socket.on(SOCKET_EVENTS.SDP_OFFER, handleOffer)
    socket.on(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
    socket.on(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
    socket.on(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
    socket.on(SOCKET_EVENTS.TOGGLE_VIDEO, handleToggleVideo)
    socket.on(SOCKET_EVENTS.TOGGLE_AUDIO, handleToggleAudio)

    // Cleanup
    return () => {
      console.log('Unregistering socket event handlers')

      socket.off(SOCKET_EVENTS.SDP_OFFER, handleOffer)
      socket.off(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
      socket.off(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
      socket.off(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
      socket.off(SOCKET_EVENTS.TOGGLE_VIDEO, handleToggleVideo)
      socket.off(SOCKET_EVENTS.TOGGLE_AUDIO, handleToggleAudio)
    }
  }, [socket])

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up...')

      // Dừng tất cả media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log('Stopping local track:', track.kind)
          track.stop()
        })
      }

      // Đóng peer connection
      if (peerConnectionRef.current) {
        console.log('Closing peer connection')
        peerConnectionRef.current.close()
      }
    }
  }, [])

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='bg-card relative w-full max-w-md overflow-hidden rounded-lg shadow-lg'>
        {/* Header */}
        <div className='bg-primary/10 flex items-center justify-between p-4'>
          <div className='flex items-center gap-2'>
            <Avatar>
              <AvatarImage src={recipientAvatar} alt={recipientName} />
              <AvatarFallback>{recipientName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className='font-medium'>{recipientName}</h3>
              <p className='text-muted-foreground text-xs'>
                {callStatus === CALL_STATUS.CALLING && 'Đang gọi...'}
                {callStatus === CALL_STATUS.RINGING && 'Đang đổ chuông...'}
                {callStatus === CALL_STATUS.CONNECTING && 'Đang kết nối...'}
                {callStatus === CALL_STATUS.CONNECTED && 'Đang kết nối'}
              </p>
            </div>
          </div>
        </div>

        {/* Video container */}
        <div className='relative h-[400px] bg-black'>
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${
              callStatus !== CALL_STATUS.CONNECTED || remoteVideoOff ? 'hidden' : ''
            }`}
          />

          {/* Avatar khi chưa kết nối hoặc không có video */}
          {(callStatus !== CALL_STATUS.CONNECTED || remoteVideoOff) && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <Avatar className='h-24 w-24'>
                <AvatarImage src={recipientAvatar} alt={recipientName} />
                <AvatarFallback>{recipientName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local video */}
          {callType === CALL_TYPE.VIDEO && (
            <div className='absolute right-4 bottom-4 h-1/4 w-1/4 overflow-hidden rounded-lg border border-white/20'>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${isCameraOff ? 'hidden' : ''}`}
              />
              {isCameraOff && (
                <div className='bg-muted flex h-full w-full items-center justify-center'>
                  <Avatar className='h-10 w-10'>
                    <AvatarImage src={session?.user?.avatar} alt={session?.user?.name || ''} />
                    <AvatarFallback>{session?.user?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {callStatus === CALL_STATUS.RINGING ? (
          <div className='flex items-center justify-center gap-4 p-4'>
            <Button onClick={handleRejectCall} variant='destructive' size='icon' className='h-12 w-12 rounded-full'>
              <Phone className='h-5 w-5 rotate-135' />
            </Button>
            <Button onClick={handleAcceptCall} className='h-12 w-12 rounded-full bg-green-500 hover:bg-green-600'>
              <Phone className='h-5 w-5' />
            </Button>
          </div>
        ) : (
          <div className='flex items-center justify-center gap-4 p-4'>
            <Button
              onClick={toggleMute}
              variant={isMuted ? 'destructive' : 'outline'}
              size='icon'
              className='h-12 w-12 rounded-full'
            >
              {isMuted ? <MicOff className='h-5 w-5' /> : <Mic className='h-5 w-5' />}
            </Button>

            {callType === CALL_TYPE.VIDEO && (
              <Button
                onClick={toggleCamera}
                variant={isCameraOff ? 'destructive' : 'outline'}
                size='icon'
                className='h-12 w-12 rounded-full'
              >
                {isCameraOff ? <VideoOff className='h-5 w-5' /> : <Video className='h-5 w-5' />}
              </Button>
            )}

            <Button onClick={handleEndCall} variant='destructive' size='icon' className='h-12 w-12 rounded-full'>
              <Phone className='h-5 w-5 rotate-135' />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}





