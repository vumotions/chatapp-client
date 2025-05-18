import React, { useEffect, useRef, useState, ReactNode } from 'react'
import Frame, { FrameContextConsumer } from 'react-frame-component'
import { createPortal } from 'react-dom'
import { ThemeProvider } from 'next-themes'
import { Button } from '~/components/ui/button'
import { Mic, MicOff, Monitor, Phone, Video, VideoOff } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { useSocket } from '~/hooks/use-socket'
import { useSession } from 'next-auth/react'
import SOCKET_EVENTS from '~/constants/socket-events'
import { CALL_STATUS, CALL_TYPE } from '~/constants/enums'
import { toast } from 'sonner'

// Định nghĩa type cho StylesInjector
interface StylesInjectorProps {
  children: ReactNode;
  styles: string;
}

// Tạo một component để truyền styles vào iframe
const StylesInjector = ({ children, styles }: StylesInjectorProps) => {
  const [iframeHead, setIframeHead] = useState<HTMLHeadElement | null>(null)

  useEffect(() => {
    if (!iframeHead) return
    
    // Tạo style element
    const styleElement = document.createElement('style')
    styleElement.type = 'text/css'
    styleElement.innerHTML = styles
    
    // Thêm vào head của iframe
    iframeHead.appendChild(styleElement)
    
    return () => {
      if (iframeHead.contains(styleElement)) {
        iframeHead.removeChild(styleElement)
      }
    }
  }, [iframeHead, styles])

  return (
    <FrameContextConsumer>
      {({ document }) => {
        if (document) {
          if (!iframeHead) {
            setIframeHead(document.head)
          }
          return createPortal(children, document.body)
        }
        return null
      }}
    </FrameContextConsumer>
  )
}

// Định nghĩa interface cho CallFrameProps
interface CallFrameProps {
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType: CALL_TYPE;
  isInitiator: boolean;
  onClose: () => void;
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
  
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(
    isInitiator ? CALL_STATUS.CALLING : CALL_STATUS.RINGING
  )
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isCameraOff, setIsCameraOff] = useState<boolean>(callType === CALL_TYPE.AUDIO)
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // Thiết lập kết nối WebRTC (tương tự như trong call/page.tsx)
  useEffect(() => {
    if (!socket || !chatId) return
    
    const initializeCall = async () => {
      try {
        // Cấu hình ICE servers
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
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
        
        // Hiển thị video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        
        // Thêm tracks vào peer connection
        stream.getTracks().forEach(track => {
          if (peerConnectionRef.current && localStreamRef.current) {
            peerConnectionRef.current.addTrack(track, localStreamRef.current)
          }
        })
        
        // Xử lý khi nhận được remote tracks
        peerConnectionRef.current.ontrack = (event: RTCTrackEvent) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setCallStatus(CALL_STATUS.CONNECTED)
          }
        }
        
        // Xử lý ICE candidates
        peerConnectionRef.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate && socket) {
            socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
              candidate: event.candidate,
              recipientId
            })
          }
        }
        
        // Nếu là người gọi, tạo offer
        if (isInitiator) {
          const offer = await peerConnectionRef.current.createOffer()
          await peerConnectionRef.current.setLocalDescription(offer)
          
          socket.emit(SOCKET_EVENTS.SDP_OFFER, {
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
    
    // Xử lý các sự kiện socket (tương tự như trong call/page.tsx)
    const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; callerId: string }) => {
      if (!peerConnectionRef.current) return
      
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)
        
        socket.emit(SOCKET_EVENTS.SDP_ANSWER, {
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
      setCallStatus(CALL_STATUS.REJECTED)
      toast.error('Cuộc gọi đã bị từ chối')
    }
    
    const handleCallEnded = () => {
      setCallStatus(CALL_STATUS.ENDED)
      toast.info('Cuộc gọi đã kết thúc')
    }
    
    if (socket) {
      socket.on(SOCKET_EVENTS.SDP_OFFER, handleOffer)
      socket.on(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
      socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
      socket.on(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
      socket.on(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
      socket.on(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
    }
    
    return () => {
      if (socket) {
        socket.off(SOCKET_EVENTS.SDP_OFFER, handleOffer)
        socket.off(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
        socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
        socket.off(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
        socket.off(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
        socket.off(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
      }
      
      // Dọn dẹp
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      screenStreamRef.current?.getTracks().forEach(track => track.stop())
      peerConnectionRef.current?.close()
    }
  }, [socket, chatId, recipientId, callType, isInitiator])
  
  // Các hàm xử lý hành động (tương tự như trong call/page.tsx)
  const handleAcceptCall = () => {
    if (!socket) return
    
    socket.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
      chatId,
      callerId: recipientId
    })
    
    setCallStatus(CALL_STATUS.CONNECTING)
  }
  
  const handleRejectCall = () => {
    if (!socket) return
    
    socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
      chatId,
      callerId: recipientId
    })
    
    onClose()
  }
  
  const handleEndCall = () => {
    if (!socket) return
    
    socket.emit(SOCKET_EVENTS.CALL_ENDED, {
      chatId,
      recipientId
    })
    
    onClose()
  }
  
  const toggleMute = () => {
    if (!localStreamRef.current) return
    
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = isMuted
    })
    
    setIsMuted(!isMuted)
    
    if (socket) {
      socket.emit(SOCKET_EVENTS.TOGGLE_AUDIO, {
        chatId,
        recipientId,
        isMuted: !isMuted
      })
    }
  }
  
  const toggleCamera = () => {
    if (!localStreamRef.current || callType === CALL_TYPE.AUDIO) return
    
    localStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = isCameraOff
    })
    
    setIsCameraOff(!isCameraOff)
    
    if (socket) {
      socket.emit(SOCKET_EVENTS.TOGGLE_VIDEO, {
        chatId,
        recipientId,
        isCameraOff: !isCameraOff
      })
    }
  }
  
  const toggleScreenSharing = async () => {
    try {
      if (isScreenSharing) {
        // Dừng chia sẻ màn hình
        screenStreamRef.current?.getTracks().forEach(track => track.stop())
        
        // Khôi phục video track ban đầu
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0]
          
          const senders = peerConnectionRef.current?.getSenders()
          const videoSender = senders?.find(sender => 
            sender.track?.kind === 'video'
          )
          
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack)
          }
          
          // Cập nhật video local
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
          }
        }
      } else {
        // Bắt đầu chia sẻ màn hình
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = screenStream
        
        // Thay thế video track hiện tại bằng screen track
        const screenTrack = screenStream.getVideoTracks()[0]
        
        const senders = peerConnectionRef.current?.getSenders()
        const videoSender = senders?.find(sender => 
          sender.track?.kind === 'video'
        )
        
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
      toast.error('Không thể chia sẻ màn hình')
    }
  }

  // CSS cho iframe
  const frameStyles = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--font-geist-sans), sans-serif;
      background-color: #121212;
      color: white;
      height: 100%;
      overflow: hidden;
    }
    
    .call-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    .video-container {
      flex: 1;
      position: relative;
      background-color: #000;
    }
    
    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .local-video-container {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 25%;
      max-width: 200px;
      height: 150px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    
    .local-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .controls {
      padding: 20px;
      background-color: #1a1a1a;
      display: flex;
      justify-content: center;
      gap: 20px;
    }
    
    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background-color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      color: white;
      margin-bottom: 16px;
    }
    
    .call-status {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.8);
    }
    
    .call-status h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .call-status p {
      color: #ccc;
    }
  `

  return (
    <Frame
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        height: '600px',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        zIndex: 9999
      }}
      head={[
        <link key="font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      ]}
    >
      <StylesInjector styles={frameStyles}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <div className="call-container">
            <div className="video-container">
              {/* Video của người nhận */}
              <video
                ref={remoteVideoRef}
                className={`remote-video ${callStatus !== CALL_STATUS.CONNECTED && 'hidden'}`}
                autoPlay
                playsInline
              />
              
              {/* Hiển thị trạng thái cuộc gọi */}
              {callStatus !== CALL_STATUS.CONNECTED && (
                <div className="call-status">
                  <div className="avatar">
                    {recipientAvatar ? (
                      <img src={recipientAvatar} alt={recipientName} />
                    ) : (
                      recipientName.charAt(0)
                    )}
                  </div>
                  <h2>{recipientName}</h2>
                  <p>
                    {callStatus === CALL_STATUS.RINGING && 'Đang gọi đến...'}
                    {callStatus === CALL_STATUS.CALLING && 'Đang đổ chuông...'}
                    {callStatus === CALL_STATUS.CONNECTING && 'Đang kết nối...'}
                    {callStatus === CALL_STATUS.REJECTED && 'Cuộc gọi bị từ chối'}
                    {callStatus === CALL_STATUS.ENDED && 'Cuộc gọi đã kết thúc'}
                  </p>
                </div>
              )}
              
              {/* Video của bản thân */}
              <div className="local-video-container">
                <video
                  ref={localVideoRef}
                  className="local-video"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </div>
            
            {/* Thanh điều khiển */}
            <div className="controls">
              {!isInitiator && callStatus === CALL_STATUS.RINGING ? (
                <>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={handleRejectCall}
                  >
                    <Phone className="h-5 w-5 rotate-135" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-600"
                    onClick={handleAcceptCall}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={isMuted ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-full"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  
                  {callType === CALL_TYPE.VIDEO && (
                    <Button
                      variant={isCameraOff ? 'secondary' : 'ghost'}
                      size="icon"
                      className="rounded-full"
                      onClick={toggleCamera}
                    >
                      {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>
                  )}
                  
                  {callType === CALL_TYPE.VIDEO && (
                    <Button
                      variant={isScreenSharing ? 'secondary' : 'ghost'}
                      size="icon"
                      className="rounded-full"
                      onClick={toggleScreenSharing}
                    >
                      <Monitor className="h-5 w-5" />
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full"
                    onClick={handleEndCall}
                  >
                    <Phone className="h-5 w-5 rotate-135" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </ThemeProvider>
      </StylesInjector>
    </Frame>
  )
}
