'use client'

import { motion } from 'framer-motion'
import { Maximize, Mic, MicOff, Minimize, Monitor, Phone, Video, VideoOff } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { CALL_STATUS, CALL_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useIsMobile } from '~/hooks/use-mobile'
import { useSocket } from '~/hooks/use-socket'
import { cn } from '~/lib/utils'
import { useCallStore } from '~/stores/call.store'

interface CallFrameProps {
  chatId: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  callType: CALL_TYPE
  isInitiator: boolean
  onClose: () => void
}

export function CallFrame({
  chatId,
  recipientId,
  recipientName,
  recipientAvatar,
  callType,
  isInitiator,
  onClose
}: CallFrameProps) {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const isMobile = useIsMobile()

  const [callStatus, setCallStatus] = useState<CALL_STATUS>(isInitiator ? CALL_STATUS.CALLING : CALL_STATUS.RINGING)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isCameraOff, setIsCameraOff] = useState<boolean>(callType === CALL_TYPE.AUDIO)
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  // Thêm state để theo dõi trạng thái thu nhỏ trên mobile
  const [isMinimizedOnMobile, setIsMinimizedOnMobile] = useState<boolean>(false)

  // Thêm state để theo dõi trạng thái mic và camera của đối phương
  const [remoteAudioMuted, setRemoteAudioMuted] = useState<boolean>(false)
  const [remoteVideoOff, setRemoteVideoOff] = useState<boolean>(callType === CALL_TYPE.AUDIO)

  // Thêm state để theo dõi trạng thái mic và camera trước khi chấp nhận cuộc gọi
  const [preAcceptMuted, setPreAcceptMuted] = useState<boolean>(false)
  const [preAcceptCameraOff, setPreAcceptCameraOff] = useState<boolean>(callType === CALL_TYPE.AUDIO)

  // Thêm hàm để toggle camera trước khi chấp nhận cuộc gọi
  const togglePreAcceptCamera = () => {
    if (!localStreamRef.current || callType === CALL_TYPE.AUDIO) return

    // Thay đổi trạng thái camera
    const newState = !preAcceptCameraOff
    setPreAcceptCameraOff(newState)

    // Áp dụng trạng thái mới cho stream
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !newState
    })
  }

  // State cho vị trí - luôn khởi tạo ở giữa màn hình
  const [position, setPosition] = useState(() => {
    // Tính toán vị trí mặc định dựa trên kích thước màn hình
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 500
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 500

    // Đặt ở giữa màn hình thay vì góc
    return {
      x: Math.max(20, (windowWidth - 500) / 2), // Căn giữa theo chiều ngang
      y: Math.max(20, (windowHeight - 400) / 2) // Căn giữa theo chiều dọc
    }
  })
  const constraintsRef = useRef(null)

  // Các ref cho video
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callContainerRef = useRef<HTMLDivElement>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // Tạo ref để theo dõi trạng thái stream
  const streamRestoreRef = useRef<boolean>(false)

  // Thêm hàm mới để dừng tất cả media tracks
  const stopAllMediaTracks = () => {
    // Dừng local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (error) {
          console.error('Error stopping track:', error)
        }
      })
      localStreamRef.current = null
    }

    // Dừng screen sharing stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (error) {
          console.error('Error stopping screen track:', error)
        }
      })
      screenStreamRef.current = null
    }

    // Xóa srcObject từ video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    // Thêm đoạn code này để đảm bảo tất cả các tracks đều bị dừng
    try {
      // Yêu cầu trình duyệt dừng tất cả các tracks đang hoạt động
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((tempStream) => {
          tempStream.getTracks().forEach((track) => {
            track.stop()
          })
        })
        .catch((err) => console.log('Không thể lấy media stream tạm thời:', err))
    } catch (error) {
      console.error('Lỗi khi cố gắng dừng tất cả media tracks:', error)
    }
  }

  // Hàm khôi phục stream không sử dụng setTimeout
  const restoreVideoStreams = () => {
    // Khôi phục local stream
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        console.log('Restored local video stream')
      }
    }

    // Khôi phục remote stream
    if (remoteVideoRef.current && peerConnectionRef.current) {
      const receivers = peerConnectionRef.current.getReceivers()
      if (receivers.length > 0 && !remoteVideoRef.current.srcObject) {
        const remoteStream = new MediaStream()
        let hasVideoTrack = false

        receivers.forEach((receiver) => {
          if (receiver.track) {
            remoteStream.addTrack(receiver.track)
            if (receiver.track.kind === 'video') {
              hasVideoTrack = true
            }
          }
        })

        if (hasVideoTrack) {
          remoteVideoRef.current.srcObject = remoteStream
          console.log('Restored remote video stream')
        }
      }
    }
  }

  // Thêm hàm để toggle trạng thái thu nhỏ trên mobile
  const toggleMinimizeOnMobile = () => {
    if (isMobile) {
      const newState = !isMinimizedOnMobile
      setIsMinimizedOnMobile(newState)

      // Nếu đang chuyển từ thu nhỏ sang full screen
      if (!newState && callContainerRef.current) {
        // Xóa hoàn toàn tất cả style inline
        callContainerRef.current.removeAttribute('style')

        // Thiết lập lại style từ đầu
        Object.assign(callContainerRef.current.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          borderRadius: '0',
          transform: 'none',
          zIndex: '100',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--card)',
          overflow: 'hidden'
        })

        // Reset vị trí trong state
        setPosition({
          x: 0,
          y: 0
        })

        // Đảm bảo khôi phục stream
        streamRestoreRef.current = true
      } else {
        streamRestoreRef.current = true
      }
    }
  }

  // Sử dụng useLayoutEffect để đảm bảo DOM đã cập nhật trước khi khôi phục stream
  useLayoutEffect(() => {
    if (streamRestoreRef.current) {
      restoreVideoStreams()
      streamRestoreRef.current = false
    }
  }, [isMinimizedOnMobile, isFullscreen])

  // Theo dõi thay đổi trạng thái thu nhỏ và fullscreen
  useEffect(() => {
    if (!isMinimizedOnMobile || isFullscreen) {
      streamRestoreRef.current = true
    }
  }, [isMinimizedOnMobile, isFullscreen])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!callContainerRef.current) return

    if (!isFullscreen) {
      try {
        if (callContainerRef.current.requestFullscreen) {
          callContainerRef.current.requestFullscreen().catch((err) => {
            console.error('Lỗi khi chuyển sang chế độ toàn màn hình:', err)
          })
        } else if ((callContainerRef.current as any).webkitRequestFullscreen) {
          ;(callContainerRef.current as any).webkitRequestFullscreen()
        } else if ((callContainerRef.current as any).msRequestFullscreen) {
          ;(callContainerRef.current as any).msRequestFullscreen()
        }
        // Đặt state sau khi đã gọi API
        setIsFullscreen(true)
        streamRestoreRef.current = true
      } catch (error) {
        console.error('Lỗi khi chuyển sang chế độ toàn màn hình:', error)
      }
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => {
            console.error('Lỗi khi thoát chế độ toàn màn hình:', err)
          })
        } else if ((document as any).webkitExitFullscreen) {
          ;(document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          ;(document as any).msExitFullscreen()
        }
        // Đặt state sau khi đã gọi API
        setIsFullscreen(false)
        streamRestoreRef.current = true
      } catch (error) {
        console.error('Lỗi khi thoát chế độ toàn màn hình:', error)
      }
    }
  }

  // Xử lý sự kiện fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).mozFullScreenElement ||
        !!(document as any).msFullscreenElement

      // Chỉ cập nhật state nếu có sự thay đổi thực sự
      if (isCurrentlyFullscreen !== isFullscreen) {
        setIsFullscreen(isCurrentlyFullscreen)

        // Nếu thoát fullscreen và đang ở mobile, đặt lại vị trí
        if (!isCurrentlyFullscreen && isMobile && !isMinimizedOnMobile) {
          // Đảm bảo vị trí đúng khi thoát fullscreen
          if (callContainerRef.current) {
            callContainerRef.current.style.position = 'fixed'
            callContainerRef.current.style.inset = '0'
            callContainerRef.current.style.width = '100%'
            callContainerRef.current.style.height = '100%'
            callContainerRef.current.style.maxWidth = '100%'
            callContainerRef.current.style.borderRadius = '0'
          }
        }
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isFullscreen, isMobile, isMinimizedOnMobile])
  // Thêm state để theo dõi trạng thái kết nối WebRTC
  const [isWebRTCInitialized, setIsWebRTCInitialized] = useState(false)
  // Thêm state để theo dõi remote stream
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  // Thêm ref để lưu trữ ICE candidates
  const iceCandidatesBuffer = useRef<RTCIceCandidateInit[]>([])

  // Add this with the other refs
  const callDurationRef = useRef<number>(0)
  const callStartTimeRef = useRef<number | null>(null)

  // Add this effect to track call duration
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    // Start tracking duration when call is connected
    if (callStatus === CALL_STATUS.CONNECTED) {
      callStartTimeRef.current = Date.now()

      // Update duration every second
      intervalId = setInterval(() => {
        if (callStartTimeRef.current) {
          const durationInSeconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          callDurationRef.current = durationInSeconds
        }
      }, 1000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [callStatus])

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

      // Check if peerConnection is still valid before setting local description
      if (!peerConnectionRef.current) {
        console.log('Cannot set local description: peer connection became null')
        return
      }

      await peerConnectionRef.current.setLocalDescription(offer)
      console.log('Set local description (offer)')

      // Đợi một chút để đảm bảo ICE gathering hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check again if peerConnection is still valid
      if (!peerConnectionRef.current) {
        console.log('Cannot send offer: peer connection became null')
        return
      }

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

  // Hàm tiện ích để xử lý các ICE candidates đã buffer
  const processBufferedIceCandidates = async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) return

    if (iceCandidatesBuffer.current && iceCandidatesBuffer.current.length > 0) {
      console.log(`Processing ${iceCandidatesBuffer.current.length} buffered ICE candidates`)

      for (const candidate of iceCandidatesBuffer.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error('Error adding buffered ICE candidate:', error)
        }
      }

      // Xóa buffer sau khi đã xử lý
      iceCandidatesBuffer.current = []
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

  // Hàm khởi tạo WebRTC được định nghĩa bên ngoài useEffect
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

      // Thêm tracks vào peer connection
      stream.getTracks().forEach((track) => {
        console.log('Adding track to peer connection:', track.kind)
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream)
        }
      })

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
        if (peerConnectionRef.current?.connectionState === 'connected') {
          setCallStatus(CALL_STATUS.CONNECTED)
        } else if (peerConnectionRef.current?.connectionState === 'failed') {
          toast.error('Kết nối cuộc gọi bị gián đoạn')
        }
      }

      // Xử lý sự kiện ontrack - quan trọng để hiển thị video của đối phương
      peerConnectionRef.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0]

          // Lưu stream vào state để React re-render
          setRemoteStream(stream)

          // Cập nhật video element trực tiếp
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream
          }

          // Cập nhật trạng thái UI
          if (event.track.kind === 'video') {
            setRemoteVideoOff(false)
            setCallStatus(CALL_STATUS.CONNECTED)
          }
        }
      }

      // Đánh dấu WebRTC đã được khởi tạo
      setIsWebRTCInitialized(true)

      // Nếu là người gọi, tạo và gửi offer
      if (isInitiator) {
        await createAndSendOffer()
      }

      return peerConnectionRef.current
    } catch (error) {
      toast.error('Không thể khởi tạo kết nối')
      throw error
    }
  }

  // useEffect cho WebRTC
  useEffect(() => {
    if (!socket || !chatId) return

    // Nếu là người gọi, khởi tạo WebRTC ngay
    if (isInitiator) {
      initializeWebRTC()
    }

    // Xử lý các sự kiện socket
    const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; callerId: string }) => {
      if (!peerConnectionRef.current) return

      try {
        // Kiểm tra trạng thái của kết nối trước khi đặt remote description
        if (peerConnectionRef.current.signalingState === 'closed') {
          console.log('Cannot set remote description: connection is closed')
          return
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))

        // Xử lý các ICE candidates đã được buffer
        await processBufferedIceCandidates()

        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)

        socket?.emit(SOCKET_EVENTS.SDP_ANSWER, {
          sdp: answer,
          recipientId: data.callerId
        })
      } catch (error) {
        console.error('Error handling offer:', error)
      }
    }

    const handleAnswer = async (data: { sdp: RTCSessionDescriptionInit; callerId: string }) => {
      if (!peerConnectionRef.current) return

      try {
        console.log('Received SDP answer')

        // Check if the connection is in a state where it can accept an answer
        if (peerConnectionRef.current.signalingState === 'stable') {
          console.log('Connection already in stable state, ignoring answer')
          return
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))

        // Xử lý các ICE candidates đã được buffer
        await processBufferedIceCandidates()
      } catch (error) {
        console.error('Error handling answer:', error)
      }
    }

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; callerId: string }) => {
      if (data.callerId !== recipientId || !peerConnectionRef.current) return

      try {
        // Kiểm tra xem remote description đã được thiết lập chưa
        if (!peerConnectionRef.current.remoteDescription) {
          // Lưu ICE candidate vào buffer để xử lý sau
          if (!iceCandidatesBuffer.current) {
            iceCandidatesBuffer.current = []
          }

          iceCandidatesBuffer.current.push(data.candidate)
          return
        }

        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (error) {
        console.error('Error adding ICE candidate:', error)
      }
    }

    const handleCallAccepted = async () => {
      if (isInitiator) {
        console.log('Call accepted by recipient')
        setCallStatus(CALL_STATUS.CONNECTING)

        try {
          // Khởi tạo WebRTC nếu chưa có
          if (!peerConnectionRef.current) {
            await initializeWebRTC()
          } else {
            // Nếu đã có peer connection, tạo và gửi offer
            await createAndSendOffer()
          }
        } catch (error) {
          console.error('Error handling call accepted:', error)
        }
      }
    }

    const handleCallRejected = () => {
      // Dừng tất cả media tracks
      stopAllMediaTracks()

      setCallStatus(CALL_STATUS.REJECTED)
      setTimeout(() => {
        onClose()
      }, 2000)
    }

    const handleCallEnded = () => {
      // Dừng tất cả media tracks
      stopAllMediaTracks()

      setCallStatus(CALL_STATUS.ENDED)
      setTimeout(() => {
        onClose()
      }, 2000)
    }

    const handleToggleAudio = (data: { isMuted: boolean }) => {
      // Chỉ cập nhật UI để hiển thị trạng thái mic của người khác
      // KHÔNG tắt mic của mình
      setRemoteAudioMuted(data.isMuted)
    }

    const handleToggleVideo = (data: { isCameraOff: boolean }) => {
      // Chỉ cập nhật UI để hiển thị trạng thái camera của người khác
      // KHÔNG tắt camera của mình
      setRemoteVideoOff(data.isCameraOff)
    }

    socket?.on(SOCKET_EVENTS.SDP_OFFER, handleOffer)
    socket?.on(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
    socket?.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
    socket?.on(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
    socket?.on(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
    socket?.on(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
    socket?.on(SOCKET_EVENTS.TOGGLE_AUDIO, handleToggleAudio)
    socket?.on(SOCKET_EVENTS.TOGGLE_VIDEO, handleToggleVideo)

    // Nếu là người gọi, gửi sự kiện INITIATE_CALL
    if (isInitiator) {
      socket?.emit(SOCKET_EVENTS.INITIATE_CALL, {
        chatId,
        recipientId,
        callType
      })
    }

    return () => {
      socket?.off(SOCKET_EVENTS.SDP_OFFER, handleOffer)
      socket?.off(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
      socket?.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
      socket?.off(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
      socket?.off(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
      socket?.off(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
      socket?.off(SOCKET_EVENTS.TOGGLE_AUDIO, handleToggleAudio)
      socket?.off(SOCKET_EVENTS.TOGGLE_VIDEO, handleToggleVideo)

      // Dọn dẹp
      stopAllMediaTracks()

      // Đóng kết nối peer một cách an toàn
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close()
        } catch (error) {
          console.error('Error closing peer connection:', error)
        } finally {
          peerConnectionRef.current = null
        }
      }
    }
  }, [socket, chatId, recipientId, callType, isInitiator, onClose])

  // Chấp nhận cuộc gọi
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

      // Áp dụng trạng thái mic và camera trước khi kết nối
      setIsMuted(preAcceptMuted)
      setIsCameraOff(preAcceptCameraOff)

      // Nếu đã có stream camera từ preview, sử dụng lại
      if (localStreamRef.current && callType === CALL_TYPE.VIDEO) {
        // Dừng các track hiện tại (chỉ có video)
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Khởi tạo WebRTC
      await initializeWebRTC()

      // Đảm bảo trạng thái được áp dụng cho stream
      if (localStreamRef.current) {
        // Áp dụng trạng thái mic
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !preAcceptMuted
        })

        // Áp dụng trạng thái camera
        if (callType === CALL_TYPE.VIDEO) {
          localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = !preAcceptCameraOff
          })
        }
      }
    } catch (error) {
      toast.error('Không thể kết nối cuộc gọi. Vui lòng thử lại.')
    }
  }

  const handleRejectCall = () => {
    socket?.emit(SOCKET_EVENTS.CALL_REJECTED, {
      chatId,
      callerId: recipientId
    })
    onClose()
  }

  const handleEndCall = () => {
    // Dừng tất cả media tracks trước khi gửi sự kiện kết thúc cuộc gọi
    stopAllMediaTracks()

    // Close and clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Reset WebRTC state
    setIsWebRTCInitialized(false)
    setRemoteStream(null)

    // Clear ICE candidates buffer
    if (iceCandidatesBuffer.current) {
      iceCandidatesBuffer.current = []
    }

    // Emit event to end call and create system message
    socket?.emit(SOCKET_EVENTS.CALL_ENDED, {
      chatId,
      recipientId,
      callType,
      duration: callDurationRef.current,
      createSystemMessage: true
    })

    // Đặt trạng thái ENDED và đóng sau 1 giây
    setCallStatus(CALL_STATUS.ENDED)
    setTimeout(() => {
      onClose()
      // Cập nhật store để xóa thông tin cuộc gọi
      useCallStore.getState().endCall()
    }, 1000)
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!localStreamRef.current) return

    // Thay đổi trạng thái mic của mình
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = isMuted
    })

    setIsMuted(!isMuted)

    // Gửi thông báo trạng thái mic của mình cho người khác
    socket?.emit(SOCKET_EVENTS.TOGGLE_AUDIO, {
      recipientId,
      chatId,
      isMuted: !isMuted
    })

    console.log('Microphone toggled:', isMuted ? 'unmuted' : 'muted')
  }

  const toggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!localStreamRef.current || callType === CALL_TYPE.AUDIO) return

    // Thay đổi trạng thái camera của mình
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOff
    })

    setIsCameraOff(!isCameraOff)

    // Gửi thông báo trạng thái camera của mình cho người khác
    socket?.emit(SOCKET_EVENTS.TOGGLE_VIDEO, {
      recipientId,
      chatId,
      isCameraOff: !isCameraOff
    })
  }

  const toggleScreenSharing = async () => {
    if (!peerConnectionRef.current) {
      // Tạm thời tạo một peer connection giả để test UI
      const configuration: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
      peerConnectionRef.current = new RTCPeerConnection(configuration)

      // Nếu chưa có localStream, tạo một stream giả
      if (!localStreamRef.current) {
        try {
          const constraints: MediaStreamConstraints = {
            audio: true,
            video: callType === CALL_TYPE.VIDEO
          }
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          localStreamRef.current = stream

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
          }
        } catch (error) {
          console.error('Error getting media stream:', error)
          toast.error('Không thể truy cập camera và microphone.')
          return
        }
      }
    }

    try {
      if (isScreenSharing) {
        // Dừng chia sẻ màn hình
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop())
        }

        // Khôi phục video từ camera
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0]
          if (videoTrack) {
            const senders = peerConnectionRef.current.getSenders()
            const videoSender = senders.find((sender) => sender.track?.kind === 'video')

            if (videoSender) {
              await videoSender.replaceTrack(videoTrack)
            }

            // Cập nhật video local
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current
            }
          }
        }
      } else {
        // Bắt đầu chia sẻ màn hình
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = screenStream

        // Thay thế video track hiện tại bằng screen track
        const screenTrack = screenStream.getVideoTracks()[0]

        const senders = peerConnectionRef.current.getSenders()
        const videoSender = senders.find((sender) => sender.track?.kind === 'video')

        if (videoSender) {
          videoSender.replaceTrack(screenTrack)
        }

        // Cập nhật video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        // Xử lý khi người dùng dừng chia sẻ màn hình
        screenTrack.onended = () => {
          setIsScreenSharing(false)
          toggleScreenSharing()
        }
      }

      setIsScreenSharing(!isScreenSharing)
    } catch (error) {
      console.error('Error toggling screen sharing:', error)
      toast.error('Không thể chia sẻ màn hình.')
    }
  }

  // Đảm bảo vị trí hợp lý khi component mount và khi thay đổi kích thước
  useEffect(() => {
    // Kiểm tra và điều chỉnh vị trí ban đầu
    const adjustInitialPosition = () => {
      // Nếu đang ở chế độ full screen trên mobile, đảm bảo style đúng
      if (isMobile && !isMinimizedOnMobile && callContainerRef.current) {
        // Xóa tất cả style cũ
        callContainerRef.current.removeAttribute('style')

        // Thiết lập style mới cho full screen
        Object.assign(callContainerRef.current.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          borderRadius: '0',
          zIndex: '100',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--card)',
          overflow: 'hidden'
        })
        return
      }

      // Xử lý vị trí cho các trường hợp khác
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const frameWidth = Math.min(500, windowWidth - 40)
      const frameHeight = Math.min(400, windowHeight - 40)

      // Luôn đặt ở giữa màn hình khi khởi tạo
      const newX = (windowWidth - frameWidth) / 2
      const newY = (windowHeight - frameHeight) / 2

      // Cập nhật vị trí
      setPosition({ x: newX, y: newY })
    }

    // Gọi ngay khi component mount
    adjustInitialPosition()

    // Thêm event listener để xử lý khi resize
    window.addEventListener('resize', adjustInitialPosition)
    return () => window.removeEventListener('resize', adjustInitialPosition)
  }, [isMobile, isMinimizedOnMobile]) // Thêm dependencies

  // Trong useEffect để lắng nghe các sự kiện socket
  useEffect(() => {
    if (!socket) return

    // Xử lý sự kiện TOGGLE_VIDEO
    const handleToggleVideo = (data: { isCameraOff: boolean }) => {
      console.log('Received TOGGLE_VIDEO event:', data)
      setRemoteVideoOff(data.isCameraOff)
    }

    // Đăng ký lắng nghe sự kiện
    socket.on(SOCKET_EVENTS.TOGGLE_VIDEO, handleToggleVideo)

    return () => {
      // Hủy đăng ký khi component unmount
      socket.off(SOCKET_EVENTS.TOGGLE_VIDEO, handleToggleVideo)
    }
  }, [socket])

  {
    /* Thêm log để debug */
  }

  useEffect(() => {
    if (remoteVideoRef.current) {
      console.log('Remote video element:', remoteVideoRef.current)
      console.log('Remote video srcObject:', remoteVideoRef.current.srcObject)

      // Kiểm tra xem video có đang phát không
      remoteVideoRef.current.onplaying = () => {
        console.log('Remote video is playing')
      }

      remoteVideoRef.current.onloadedmetadata = () => {
        console.log('Remote video metadata loaded')
      }
    }
  }, [remoteVideoRef.current?.srcObject])

  // Thêm useEffect để theo dõi trạng thái của remoteVideoRef
  useEffect(() => {
    if (remoteVideoRef.current) {
      // Thêm event listener để debug
      remoteVideoRef.current.onloadedmetadata = () => {
        console.log('Remote video metadata loaded')
        remoteVideoRef.current?.play().catch((err) => {
          console.error('Error playing remote video:', err)
        })
      }

      remoteVideoRef.current.onplay = () => {
        console.log('Remote video is playing')
        // Đảm bảo trạng thái UI được cập nhật
        if (callStatus !== CALL_STATUS.CONNECTED) {
          setCallStatus(CALL_STATUS.CONNECTED)
        }
      }

      remoteVideoRef.current.onerror = (e) => {
        console.error('Remote video error:', e)
      }
    }
  }, [remoteVideoRef.current, callStatus])

  // Thay đổi toàn bộ container khi thu nhỏ trên mobile để có hiệu ứng glass
  const minimizedContainerClass =
    isMobile && isMinimizedOnMobile
      ? 'fixed bottom-16 right-4 w-[200px] h-[250px] rounded-xl overflow-hidden border border-gray-700 bg-black/30 backdrop-blur-md shadow-lg z-50'
      : ''

  // Thêm hàm để khởi tạo camera trước khi chấp nhận cuộc gọi
  const initializeLocalPreviewBeforeAccept = async () => {
    try {
      // Chỉ khởi tạo camera nếu là cuộc gọi video và người nhận cuộc gọi
      if (callType === CALL_TYPE.VIDEO && !isInitiator) {
        const constraints = {
          audio: false, // Không bật mic trước khi chấp nhận
          video: true
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream

        // Hiển thị video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          console.log('Set local preview video before accepting call')
        }

        // Áp dụng trạng thái camera
        stream.getVideoTracks().forEach((track) => {
          track.enabled = !preAcceptCameraOff
        })
      }
    } catch (error) {
      console.error('Error initializing local preview:', error)
    }
  }

  // Thêm useEffect để khởi tạo camera khi nhận được cuộc gọi
  useEffect(() => {
    // Chỉ khởi tạo nếu là người nhận cuộc gọi và đang ở trạng thái ringing
    if (!isInitiator && callStatus === CALL_STATUS.RINGING) {
      initializeLocalPreviewBeforeAccept()
    }

    // Cleanup function
    return () => {
      if (!isInitiator && callStatus === CALL_STATUS.RINGING && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isInitiator, callStatus, callType])

  // Thêm useEffect riêng biệt để xử lý timeout cuộc gọi
  useEffect(() => {
    // Chỉ thiết lập timeout cho người gọi (isInitiator = true)
    if (!isInitiator) {
      console.log('Not setting timeout for call recipient')
      return
    }

    // Chỉ thiết lập timeout khi ở trạng thái CALLING hoặc RINGING
    const isCallingState = callStatus === CALL_STATUS.CALLING || callStatus === CALL_STATUS.RINGING
    if (!isCallingState) {
      console.log('Not in calling/ringing state, not setting timeout. Current state:', callStatus)
      return
    }

    const timeout = setTimeout(() => {
      // Kiểm tra lại trạng thái hiện tại
      const isStillCalling = callStatus === CALL_STATUS.CALLING || callStatus === CALL_STATUS.RINGING
      if (isStillCalling) {
        console.log('Call still in calling/ringing state after 10 seconds, marking as missed')

        // Gửi sự kiện cuộc gọi nhỡ
        socket?.emit(SOCKET_EVENTS.CALL_MISSED, {
          chatId,
          recipientId,
          callType
        })

        // Đóng cuộc gọi
        setCallStatus(CALL_STATUS.MISSED)
        setTimeout(() => {
          onClose()
          // Cập nhật store để xóa thông tin cuộc gọi
          useCallStore.getState().endCall()
        }, 1000)
      } else {
        console.log('Call status changed, not marking as missed:', callStatus)
      }
    }, 30000)

    // Cleanup function
    return () => {
      console.log('Cleaning up missed call timeout')
      clearTimeout(timeout)
    }
  }, [isInitiator, callStatus, socket, chatId, recipientId, callType, onClose])

  // useEffect(() => {
  //   if (!socket) return

  //   const handleCallMissed = (data: { chatId: string; recipientId: string }) => {
  //     console.log('Received CALL_MISSED event:', data)

  //     if (data.chatId === chatId) {
  //       console.log('This call was marked as missed, closing call frame')

  //       setCallStatus(CALL_STATUS.MISSED)
  //       setTimeout(() => {
  //         onClose()
  //         // Cập nhật store để xóa thông tin cuộc gọi
  //         useCallStore.getState().endCall()
  //       }, 1000)
  //     }
  //   }

  //   // Đăng ký lắng nghe sự kiện
  //   socket.on(SOCKET_EVENTS.CALL_MISSED, handleCallMissed)

  //   return () => {
  //     // Hủy đăng ký khi component unmount
  //     socket.off(SOCKET_EVENTS.CALL_MISSED, handleCallMissed)
  //   }
  // }, [socket, chatId, onClose])

  return (
    <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center'>
      <div className='flex h-full w-full items-center justify-center' ref={constraintsRef}>
        <motion.div
          layoutId='callContainer'
          ref={callContainerRef}
          drag={!isFullscreen && (!isMobile || isMinimizedOnMobile)}
          dragConstraints={constraintsRef}
          dragMomentum={false}
          dragElastic={0.1}
          whileDrag={{ scale: 1.02 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            // Đảm bảo reset transform khi không ở chế độ thu nhỏ trên mobile
            ...(isMobile && !isMinimizedOnMobile ? { x: 0, y: 0 } : {})
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300
          }}
          onDragEnd={(e, info) => {
            if (!isFullscreen && (!isMobile || isMinimizedOnMobile)) {
              // Tính toán vị trí mới
              let newX = position.x + info.offset.x
              let newY = position.y + info.offset.y

              // Giới hạn vị trí trong màn hình
              const windowWidth = window.innerWidth
              const windowHeight = window.innerHeight
              const frameWidth = isMobile && isMinimizedOnMobile ? 180 : 500
              const frameHeight = isMobile && isMinimizedOnMobile ? 240 : 400

              if (newX < 20) newX = 20
              if (newX + frameWidth > windowWidth - 20) newX = windowWidth - frameWidth - 20
              if (newY < 20) newY = 20
              if (newY + frameHeight > windowHeight - 20) newY = windowHeight - frameHeight - 20

              setPosition({
                x: newX,
                y: newY
              })
            }
          }}
          className='pointer-events-auto'
          style={{
            position: isFullscreen || (isMobile && !isMinimizedOnMobile) ? 'fixed' : 'absolute',
            width:
              isMobile && isMinimizedOnMobile
                ? '180px'
                : isFullscreen || (isMobile && !isMinimizedOnMobile)
                  ? '100%'
                  : '500px',
            maxWidth:
              isMobile && isMinimizedOnMobile
                ? '180px'
                : isFullscreen || (isMobile && !isMinimizedOnMobile)
                  ? '100%'
                  : '500px',
            height:
              isMobile && isMinimizedOnMobile
                ? '240px'
                : isFullscreen || (isMobile && !isMinimizedOnMobile)
                  ? '100%'
                  : '400px',
            zIndex: 100,
            borderRadius:
              isMobile && isMinimizedOnMobile
                ? '12px'
                : isFullscreen || (isMobile && !isMinimizedOnMobile)
                  ? '0'
                  : '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--card)',
            boxShadow:
              isMobile && isMinimizedOnMobile
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                : isFullscreen || (isMobile && !isMinimizedOnMobile)
                  ? 'none'
                  : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border:
              isMobile && isMinimizedOnMobile
                ? '1px solid var(--border)'
                : isFullscreen || (isMobile && !isMinimizedOnMobile)
                  ? 'none'
                  : '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            ...(isMobile &&
              isMinimizedOnMobile && {
                right: '16px',
                bottom: '80px',
                top: 'auto',
                left: 'auto'
              })
          }}
        >
          {/* Thanh tiêu đề */}
          <div className='absolute top-0 right-0 left-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3'>
            <div className='flex items-center gap-2'>
              <Avatar
                className={`flex items-center justify-center ${isMobile && isMinimizedOnMobile ? 'h-6 w-6' : 'h-8 w-8'}`}
              >
                <AvatarImage src={recipientAvatar} alt={recipientName} className='object-cover' />
                <AvatarFallback className='bg-primary text-primary-foreground'>
                  {recipientName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {(!isMobile || !isMinimizedOnMobile) && (
                <div>
                  <h3 className='text-sm font-medium text-white'>{recipientName}</h3>
                  <p className='text-xs text-gray-300'>
                    {callStatus === CALL_STATUS.CONNECTED ? 'Đang kết nối' : 'Cuộc gọi video'}
                  </p>
                </div>
              )}
            </div>

            <div className='flex items-center gap-2'>
              {isMobile && (
                <button
                  onClick={toggleMinimizeOnMobile}
                  className={`rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60 ${
                    isMinimizedOnMobile ? 'ml-auto' : ''
                  }`}
                >
                  {isMinimizedOnMobile ? <Maximize className='size-4' /> : <Minimize className='size-4' />}
                </button>
              )}
              {/* Chỉ hiển thị nút fullscreen khi KHÔNG phải là mobile */}
              {!isMobile && !isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className='rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60'
                >
                  <Maximize className='size-4' />
                </button>
              )}
              {!isMobile && isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className='rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60'
                >
                  <Minimize className='size-4' />
                </button>
              )}
            </div>
          </div>

          {/* Video container - Điều chỉnh padding-bottom để tạo khoảng cách với buttons */}
          <div
            className='bg-muted relative flex-grow'
            style={{
              paddingBottom: isMobile && isMinimizedOnMobile ? '0' : '70px'
            }}
          >
            {/* Remote video - Đảm bảo hiển thị khi có kết nối và không bị ẩn */}
            <video
              ref={remoteVideoRef}
              autoPlay={true}
              playsInline={true}
              muted={false}
              disablePictureInPicture={true}
              controlsList='nodownload nofullscreen noremoteplayback'
              className={`absolute inset-0 h-full w-full object-cover ${
                remoteVideoOff || callStatus !== CALL_STATUS.CONNECTED ? 'hidden' : ''
              }`}
              style={{ zIndex: 1 }}
            />

            {/* Hiển thị avatar khi không có video hoặc khi ở chế độ thu nhỏ trên mobile hoặc khi đối phương tắt camera */}
            {(remoteVideoOff || callStatus !== CALL_STATUS.CONNECTED || (isMobile && isMinimizedOnMobile)) && (
              <div className='bg-card absolute inset-0 flex items-center justify-center'>
                <div className='flex flex-col items-center'>
                  <div className='relative mb-2'>
                    {callStatus === CALL_STATUS.CALLING || callStatus === CALL_STATUS.RINGING ? (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <div
                          className={`bg-primary/30 absolute animate-ping rounded-full ${
                            isMobile && isMinimizedOnMobile ? 'h-16 w-16' : 'h-32 w-32'
                          }`}
                        ></div>
                        <div
                          className={`bg-primary/20 absolute animate-ping rounded-full ${
                            isMobile && isMinimizedOnMobile ? 'h-14 w-14' : 'h-28 w-28'
                          }`}
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    ) : null}
                    <Avatar className={`${isMobile && isMinimizedOnMobile ? 'h-12 w-12' : 'h-24 w-24'}`}>
                      <AvatarImage src={recipientAvatar} alt={recipientName} className='object-cover' />
                      <AvatarFallback className='bg-primary text-primary-foreground'>
                        {recipientName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {(!isMobile || !isMinimizedOnMobile) && (
                    <>
                      <h3 className='text-foreground text-lg font-medium'>{recipientName}</h3>
                      <p className='text-muted-foreground text-sm'>
                        {callStatus === CALL_STATUS.CONNECTING && 'Đang kết nối...'}
                        {callStatus === CALL_STATUS.CONNECTED &&
                          remoteVideoOff &&
                          callType === CALL_TYPE.VIDEO &&
                          'Đã tắt camera'}
                        {callStatus === CALL_STATUS.CALLING && 'Đang gọi...'}
                        {callStatus === CALL_STATUS.RINGING && 'Đang đổ chuông...'}
                        {callStatus === CALL_STATUS.REJECTED && 'Cuộc gọi bị từ chối'}
                        {callStatus === CALL_STATUS.ENDED && 'Cuộc gọi đã kết thúc'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Local video (picture-in-picture) - Ẩn nếu là cuộc gọi audio hoặc đã thu nhỏ trên mobile */}
            {callType === CALL_TYPE.VIDEO && !isMinimizedOnMobile && (
              <div
                className={`border-border bg-card absolute ${
                  isMobile ? 'right-3 bottom-[80px] h-1/4 w-1/4' : 'right-3 bottom-[80px] h-1/3 w-1/3'
                } z-10 overflow-hidden rounded-lg border shadow-md`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  disablePictureInPicture
                  controlsList='nodownload nofullscreen noremoteplayback'
                  className={`h-full w-full object-cover ${isCameraOff ? 'hidden' : ''}`}
                />
                {isCameraOff && (
                  <div className='flex h-full w-full items-center justify-center'>
                    <Avatar className='h-16 w-16'>
                      <AvatarImage src={session?.user?.avatar || ''} alt={session?.user?.name || ''} />
                      <AvatarFallback>{session?.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
            )}

            {callType === CALL_TYPE.AUDIO && (
              <video ref={localVideoRef} autoPlay playsInline muted className='hidden' />
            )}
          </div>

          {/* Các nút điều khiển - Hiển thị nút chấp nhận/từ chối khi đang ở trạng thái RINGING */}
          <div
            className={`bg-card/80 absolute right-0 bottom-0 left-0 z-20 flex items-center justify-center backdrop-blur-md ${
              isMobile && isMinimizedOnMobile ? 'px-1 pt-1 pb-2' : 'p-3'
            }`}
          >
            {callStatus === CALL_STATUS.RINGING && !isInitiator ? (
              <div className='flex items-center justify-center gap-2'>
                {/* Khi ở chế độ thu nhỏ, chỉ hiển thị nút từ chối và chấp nhận */}
                {!(isMobile && isMinimizedOnMobile) && (
                  <>
                    {/* Nút tắt mic */}
                    <Button
                      onClick={() => setPreAcceptMuted(!preAcceptMuted)}
                      className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                        isMobile ? 'h-10 w-10' : 'h-12 w-12'
                      } ${
                        preAcceptMuted
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {preAcceptMuted ? (
                        <MicOff className={`${isMobile ? 'size-4' : 'size-5'}`} />
                      ) : (
                        <Mic className={`${isMobile ? 'size-4' : 'size-5'}`} />
                      )}
                    </Button>

                    {/* Nút tắt camera (chỉ hiển thị khi là cuộc gọi video) */}
                    {callType === CALL_TYPE.VIDEO && (
                      <Button
                        onClick={togglePreAcceptCamera}
                        className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                          isMobile ? 'h-10 w-10' : 'h-12 w-12'
                        } ${
                          preAcceptCameraOff
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-muted text-foreground hover:bg-muted/80'
                        }`}
                      >
                        {preAcceptCameraOff ? (
                          <VideoOff className={`${isMobile ? 'size-4' : 'size-5'}`} />
                        ) : (
                          <Video className={`${isMobile ? 'size-4' : 'size-5'}`} />
                        )}
                      </Button>
                    )}
                  </>
                )}

                {/* Nút từ chối cuộc gọi */}
                <Button
                  onClick={handleRejectCall}
                  size='icon'
                  variant='destructive'
                  className={`${
                    isMobile && isMinimizedOnMobile ? 'h-8 w-8' : isMobile ? 'h-10 w-10' : 'h-12 w-12'
                  } rounded-full p-0 transition-transform duration-200 hover:scale-105`}
                >
                  <Phone
                    className={`${
                      isMobile && isMinimizedOnMobile ? 'size-4' : isMobile ? 'size-5' : 'h-6 w-6'
                    } rotate-135`}
                  />
                </Button>

                {/* Nút chấp nhận cuộc gọi */}
                <Button
                  data-accept-call
                  onClick={handleAcceptCall}
                  size='lg'
                  variant='default'
                  className={`${
                    isMobile && isMinimizedOnMobile ? 'h-8 w-8' : isMobile ? 'h-10 w-10' : 'h-12 w-12'
                  } rounded-full bg-green-500 p-0 text-white transition-transform duration-200 hover:scale-105 hover:bg-green-600`}
                >
                  <Phone
                    className={`${isMobile && isMinimizedOnMobile ? 'size-4' : isMobile ? 'size-5' : 'h-6 w-6'}`}
                  />
                </Button>
              </div>
            ) : (
              <div
                className={cn(`flex justify-center gap-3`, {
                  'gap-2': isMobile
                })}
              >
                {/* Nút tắt/bật mic */}
                <Button
                  onClick={toggleMute}
                  className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                    isMobile ? 'h-9 w-9' : 'h-12 w-12'
                  } ${
                    isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className={`${isMobile ? 'size-4' : 'size-5'}`} />
                  ) : (
                    <Mic className={`${isMobile ? 'size-4' : 'size-5'}`} />
                  )}
                </Button>

                {/* Nút tắt/bật camera (chỉ hiển thị khi là cuộc gọi video) */}
                {callType === CALL_TYPE.VIDEO && (
                  <button
                    onClick={toggleCamera}
                    className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                      isMobile ? 'h-9 w-9' : 'h-12 w-12'
                    } ${
                      isCameraOff
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {isCameraOff ? (
                      <VideoOff className={`${isMobile ? 'size-4' : 'size-5'}`} />
                    ) : (
                      <Video className={`${isMobile ? 'size-4' : 'size-5'}`} />
                    )}
                  </button>
                )}

                {/* Nút chia sẻ màn hình (chỉ hiển thị khi là cuộc gọi video và đã kết nối) */}
                {callType === CALL_TYPE.VIDEO && callStatus === CALL_STATUS.CONNECTED && (
                  <button
                    onClick={toggleScreenSharing}
                    className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                      isMobile ? 'h-9 w-9' : 'h-12 w-12'
                    } ${
                      isScreenSharing
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Monitor className={`${isMobile ? 'size-4' : 'size-5'}`} />
                  </button>
                )}

                {/* Nút kết thúc cuộc gọi */}
                <Button
                  onClick={handleEndCall}
                  size='lg'
                  variant='destructive'
                  className={`${
                    isMobile ? 'h-9 w-9' : 'h-12 w-12'
                  } rounded-full p-0 transition-transform duration-200 hover:scale-105`}
                >
                  <Phone className={`${isMobile ? 'size-4' : 'size-5'} rotate-135`} />
                </Button>

                {/* Removed fullscreen button from here */}
              </div>
            )}
          </div>

          {/* Thêm các nút điều khiển khi ở chế độ thu nhỏ và đã kết nối */}
          {isMobile && isMinimizedOnMobile && (
            <div className='absolute right-0 bottom-0 left-0 flex justify-center gap-0.5 border-t border-gray-700/50 bg-black/30 p-0.5 backdrop-blur-md'>
              {callStatus === CALL_STATUS.RINGING ? (
                // Nút chấp nhận/từ chối khi đang đổ chuông
                <>
                  {callType === CALL_TYPE.VIDEO && (
                    <button
                      onClick={togglePreAcceptCamera}
                      className={`flex size-4 items-center justify-center rounded-full transition-colors duration-200 ${
                        preAcceptCameraOff ? 'bg-red-500/90' : 'bg-black/50'
                      } text-white`}
                    >
                      {preAcceptCameraOff ? <VideoOff className='h-1.5 w-1.5' /> : <Video className='h-1.5 w-1.5' />}
                    </button>
                  )}
                  <button
                    onClick={handleRejectCall}
                    className='flex size-4 items-center justify-center rounded-full bg-red-500/90 text-white'
                  >
                    <Phone className='h-1.5 w-1.5 rotate-135' />
                  </button>
                  <button
                    onClick={handleAcceptCall}
                    className='flex size-4 items-center justify-center rounded-full bg-green-500/90 text-white'
                  >
                    <Phone className='h-1.5 w-1.5' />
                  </button>
                </>
              ) : callStatus === CALL_STATUS.CALLING ? (
                // Nút điều khiển khi đang gọi (caller)
                <>
                  <button
                    onClick={toggleMute}
                    className={`flex size-4 items-center justify-center rounded-full ${
                      isMuted ? 'bg-red-500/90' : 'bg-black/50'
                    } text-white`}
                  >
                    {isMuted ? <MicOff className='h-1.5 w-1.5' /> : <Mic className='h-1.5 w-1.5' />}
                  </button>

                  <button
                    onClick={handleEndCall}
                    className='flex size-4 items-center justify-center rounded-full bg-red-500/90 text-white'
                  >
                    <Phone className='h-1.5 w-1.5 rotate-135' />
                  </button>
                </>
              ) : (
                callStatus === CALL_STATUS.CONNECTED && (
                  // Nút điều khiển khi đã kết nối
                  <>
                    <button
                      onClick={toggleMute}
                      className={`flex size-4 items-center justify-center rounded-full ${
                        isMuted ? 'bg-red-500/90' : 'bg-black/50'
                      } text-white`}
                    >
                      {isMuted ? <MicOff className='h-1.5 w-1.5' /> : <Mic className='h-1.5 w-1.5' />}
                    </button>

                    {callType === CALL_TYPE.VIDEO && (
                      <button
                        onClick={toggleCamera}
                        className={`flex size-4 items-center justify-center rounded-full ${
                          isCameraOff ? 'bg-red-500/90' : 'bg-black/50'
                        } text-white`}
                      >
                        {isCameraOff ? <VideoOff className='h-1.5 w-1.5' /> : <Video className='h-1.5 w-1.5' />}
                      </button>
                    )}

                    <button
                      onClick={handleEndCall}
                      className='flex size-4 items-center justify-center rounded-full bg-red-500/90 text-white'
                    >
                      <Phone className='h-1.5 w-1.5 rotate-135' />
                    </button>
                  </>
                )
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
