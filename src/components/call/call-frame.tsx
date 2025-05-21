'use client'

import { motion } from 'framer-motion'
import { Maximize, Mic, MicOff, Minimize, Monitor, Phone, Video, VideoOff } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { CALL_STATUS, CALL_TYPE } from '~/constants/enums'
import SOCKET_EVENTS from '~/constants/socket-events'
import { useIsMobile } from '~/hooks/use-mobile'
import { useSocket } from '~/hooks/use-socket'

// Định nghĩa interface cho CallFrameProps
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
    console.log('Stopping all media tracks')

    // Dừng local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(`Stopping local track: ${track.kind}`)
        track.stop()
        track.enabled = false // Thêm dòng này để đảm bảo track bị vô hiệu hóa
      })
      localStreamRef.current = null // Đặt thành null để giải phóng tham chiếu
    }

    // Dừng screen sharing stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        console.log(`Stopping screen track: ${track.kind}`)
        track.stop()
        track.enabled = false // Thêm dòng này để đảm bảo track bị vô hiệu hóa
      })
      screenStreamRef.current = null // Đặt thành null để giải phóng tham chiếu
    }

    // Đóng peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop()
          sender.track.enabled = false
        }
      })
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Xóa srcObject khỏi video elements
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
      if (isMinimizedOnMobile) {
        // Chuyển từ thu nhỏ sang full screen
        setIsMinimizedOnMobile(false)
        streamRestoreRef.current = true
      } else {
        // Chuyển sang trạng thái thu nhỏ
        setIsMinimizedOnMobile(true)
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

  // Thiết lập kết nối WebRTC
  useEffect(() => {
    if (!socket || !chatId) return

    const initializeCall = async () => {
      try {
        // Cấu hình ICE servers
        const configuration: RTCConfiguration = {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
        }

        // Tạo peer connection
        peerConnectionRef.current = new RTCPeerConnection(configuration)

        // Lấy stream từ camera và microphone
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: callType === CALL_TYPE.VIDEO
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream
        console.log('Got local stream:', stream, 'Video tracks:', stream.getVideoTracks().length)

        // Hiển thị video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // Thêm tracks vào peer connection
        stream.getTracks().forEach((track) => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, stream)
          }
        })

        // Xử lý khi nhận được remote tracks
        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setCallStatus(CALL_STATUS.CONNECTED)
          }
        }

        // Xử lý ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket?.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
              candidate: event.candidate,
              recipientId
            })
          }
        }

        // Nếu là người gọi, tạo offer
        if (isInitiator) {
          const offer = await peerConnectionRef.current.createOffer()
          await peerConnectionRef.current.setLocalDescription(offer)

          socket?.emit(SOCKET_EVENTS.SDP_OFFER, {
            sdp: offer,
            recipientId,
            chatId
          })
        }
      } catch (error) {
        console.error('Error initializing call:', error)
        toast.error('Không thể khởi tạo cuộc gọi. Vui lòng kiểm tra quyền truy cập camera và microphone.')
      }
    }

    initializeCall()

    // Xử lý các sự kiện socket
    const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; callerId: string }) => {
      if (!peerConnectionRef.current) return

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
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

    const handleAnswer = async (data: { sdp: RTCSessionDescriptionInit }) => {
      if (!peerConnectionRef.current) return

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
        setCallStatus(CALL_STATUS.CONNECTING)
      } catch (error) {
        console.error('Error handling answer:', error)
      }
    }

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (!peerConnectionRef.current) return

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (error) {
        console.error('Error handling ICE candidate:', error)
      }
    }

    const handleCallAccepted = () => {
      setCallStatus(CALL_STATUS.CONNECTING)
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
      setIsMuted(data.isMuted)
    }

    const handleToggleVideo = (data: { isCameraOff: boolean }) => {
      setIsCameraOff(data.isCameraOff)
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [socket, chatId, recipientId, callType, isInitiator, onClose])

  const handleAcceptCall = () => {
    socket?.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
      chatId,
      callerId: recipientId
    })
    setCallStatus(CALL_STATUS.CONNECTING)
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

    socket?.emit(SOCKET_EVENTS.CALL_ENDED, {
      chatId,
      recipientId
    })

    // Đặt trạng thái ENDED và đóng sau 1 giây
    setCallStatus(CALL_STATUS.ENDED)
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!localStreamRef.current) return

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = isMuted
    })

    setIsMuted(!isMuted)

    socket?.emit(SOCKET_EVENTS.TOGGLE_AUDIO, {
      chatId,
      recipientId,
      isMuted: !isMuted
    })

    console.log('Microphone toggled:', isMuted ? 'unmuted' : 'muted')
  }

  const toggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!localStreamRef.current || callType === CALL_TYPE.AUDIO) return

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOff
    })

    setIsCameraOff(!isCameraOff)

    socket?.emit(SOCKET_EVENTS.TOGGLE_VIDEO, {
      chatId,
      recipientId,
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
            scale: 1
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
              <div className='bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full'>
                {recipientAvatar ? (
                  <img src={recipientAvatar} alt={recipientName} className='h-full w-full rounded-full object-cover' />
                ) : (
                  <span className='text-sm font-medium'>{recipientName.charAt(0)}</span>
                )}
              </div>
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
                  className='rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60'
                >
                  {isMinimizedOnMobile ? <Maximize className='h-4 w-4' /> : <Minimize className='h-4 w-4' />}
                </button>
              )}
              {/* Chỉ hiển thị nút fullscreen khi KHÔNG phải là mobile */}
              {!isMobile && !isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className='rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60'
                >
                  <Maximize className='h-4 w-4' />
                </button>
              )}
              {!isMobile && isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className='rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60'
                >
                  <Minimize className='h-4 w-4' />
                </button>
              )}
            </div>
          </div>

          {/* Video container - Điều chỉnh padding-bottom để tạo khoảng cách với buttons */}
          <div
            className='bg-muted relative flex-grow'
            style={{
              paddingBottom: isMobile && isMinimizedOnMobile ? '0' : '70px' // Tăng padding-bottom từ 50px lên 70px
            }}
          >
            {/* Remote video - Ẩn khi ở chế độ thu nhỏ trên mobile */}
            {!(isMobile && isMinimizedOnMobile) && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                disablePictureInPicture
                controlsList='nodownload nofullscreen noremoteplayback'
                className={`absolute inset-0 h-full w-full object-cover ${
                  callStatus !== CALL_STATUS.CONNECTED || isCameraOff ? 'hidden' : ''
                }`}
              />
            )}

            {/* Hiển thị avatar khi không có video hoặc khi ở chế độ thu nhỏ trên mobile */}
            {(callStatus !== CALL_STATUS.CONNECTED || isCameraOff || (isMobile && isMinimizedOnMobile)) && (
              <div className='bg-card absolute inset-0 flex items-center justify-center'>
                <div className='flex flex-col items-center'>
                  <div className='relative mb-2'>
                    {callStatus === CALL_STATUS.CALLING || callStatus === CALL_STATUS.RINGING ? (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='bg-primary/30 absolute h-32 w-32 animate-ping rounded-full'></div>
                        <div
                          className='bg-primary/20 absolute h-28 w-28 animate-ping rounded-full'
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    ) : null}
                    <div className='bg-primary/10 relative z-10 rounded-full p-2'>
                      <div
                        className={`bg-primary text-primary-foreground flex items-center justify-center overflow-hidden rounded-full ${
                          isMobile && isMinimizedOnMobile ? 'h-16 w-16' : 'h-24 w-24'
                        }`}
                      >
                        {recipientAvatar ? (
                          <img src={recipientAvatar} alt={recipientName} className='h-full w-full object-cover' />
                        ) : (
                          <span className={`font-medium ${isMobile && isMinimizedOnMobile ? 'text-xl' : 'text-3xl'}`}>
                            {recipientName.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Chỉ hiển thị tên và trạng thái khi không ở chế độ thu nhỏ */}
                  {!(isMobile && isMinimizedOnMobile) && (
                    <>
                      <p className='text-card-foreground font-medium'>{recipientName}</p>
                      {callStatus === CALL_STATUS.CALLING && (
                        <p className='text-muted-foreground mt-1 text-sm'>Đang gọi...</p>
                      )}
                      {callStatus === CALL_STATUS.RINGING && (
                        <p className='text-muted-foreground mt-1 text-sm'>Đang đổ chuông...</p>
                      )}
                      {callStatus === CALL_STATUS.CONNECTING && (
                        <p className='text-muted-foreground mt-1 text-sm'>Đang kết nối...</p>
                      )}
                      {callStatus === CALL_STATUS.CONNECTED && (
                        <p className='text-muted-foreground mt-1 text-sm'>Đang kết nối</p>
                      )}
                    </>
                  )}

                  {/* Nút chấp nhận/từ chối chỉ hiển thị khi đang đổ chuông và không ở chế độ thu nhỏ */}
                  {callStatus === CALL_STATUS.RINGING && !(isMobile && isMinimizedOnMobile) && (
                    <div className='mt-6 flex gap-4'>
                      <Button
                        onClick={handleRejectCall}
                        size='lg'
                        variant='destructive'
                        className='h-12 w-12 rounded-full p-0 transition-transform duration-200 hover:scale-105'
                      >
                        <Phone className='h-6 w-6 rotate-135' />
                      </Button>
                      <Button
                        data-accept-call
                        onClick={handleAcceptCall}
                        size='lg'
                        variant='default'
                        className='h-12 w-12 rounded-full bg-green-500 p-0 transition-transform duration-200 hover:scale-105 hover:bg-green-600'
                      >
                        <Phone className='h-6 w-6' />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Local video (picture-in-picture) - Ẩn nếu là cuộc gọi audio hoặc đã thu nhỏ trên mobile */}
            {callType === CALL_TYPE.VIDEO && !isMinimizedOnMobile && (
              <div
                className={`border-border bg-card absolute ${
                  isMobile ? 'right-3 bottom-[80px] h-1/4 w-1/4' : 'right-3 bottom-[80px] h-1/3 w-1/3'
                } overflow-hidden rounded-lg border shadow-md`}
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
                  <div className='bg-card flex h-full w-full items-center justify-center'>
                    <div className='bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center overflow-hidden rounded-full'>
                      {session?.user?.avatar ? (
                        <img
                          src={session.user.avatar}
                          alt={session?.user?.name || ''}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <span className='text-sm font-medium'>{session?.user?.name?.[0] || '?'}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {callType === CALL_TYPE.AUDIO && (
              <video ref={localVideoRef} autoPlay playsInline muted className='hidden' />
            )}
          </div>

          {/* Các nút điều khiển - Điều chỉnh kích thước và bố cục khi ở chế độ thu nhỏ */}
          <div
            className={`bg-card/80 absolute right-0 bottom-0 left-0 flex items-center justify-center backdrop-blur-md gap-${isMobile && isMinimizedOnMobile ? '1' : '3'} p-${isMobile && isMinimizedOnMobile ? '2' : '4'} ${isFullscreen ? 'mb-6' : ''} `}
          >
            <button
              onClick={toggleMute}
              className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                isMobile && isMinimizedOnMobile ? 'h-8 w-8' : 'h-12 w-12'
              } ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-muted text-foreground hover:bg-muted/80'}`}
            >
              {isMuted ? (
                <MicOff className={`${isMobile && isMinimizedOnMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
              ) : (
                <Mic className={`${isMobile && isMinimizedOnMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
              )}
            </button>

            {callType === CALL_TYPE.VIDEO && (
              <button
                onClick={toggleCamera}
                className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                  isMobile && isMinimizedOnMobile ? 'h-8 w-8' : 'h-12 w-12'
                } ${
                  isCameraOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {isCameraOff ? (
                  <VideoOff className={`${isMobile && isMinimizedOnMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
                ) : (
                  <Video className={`${isMobile && isMinimizedOnMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
                )}
              </button>
            )}

            {callType === CALL_TYPE.VIDEO && !(isMobile && isMinimizedOnMobile) && (
              <button
                onClick={toggleScreenSharing}
                className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
                  isScreenSharing
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                } h-12 w-12`}
              >
                <Monitor className='h-5 w-5' />
              </button>
            )}

            <button
              onClick={handleEndCall}
              className={`flex items-center justify-center rounded-full bg-red-500 text-white transition-colors duration-200 hover:bg-red-600 ${
                isMobile && isMinimizedOnMobile ? 'h-8 w-8' : 'h-12 w-12'
              }`}
            >
              <Phone className={`rotate-135 ${isMobile && isMinimizedOnMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
