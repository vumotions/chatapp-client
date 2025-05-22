'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSocket } from '~/hooks/use-socket'
import { useSession } from 'next-auth/react'
import SOCKET_EVENTS from '~/constants/socket-events'
import { CALL_STATUS, CALL_TYPE } from '~/constants/enums'
import { Button } from '~/components/ui/button'
import { Mic, MicOff, Monitor, Phone, Video, VideoOff } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { toast } from 'sonner'

export default function CallPage() {
  const searchParams = useSearchParams()
  const chatId = searchParams.get('chatId') || ''
  const type = searchParams.get('type') as CALL_TYPE || CALL_TYPE.VIDEO
  const isInitiator = searchParams.get('initiator') === 'true'
  const recipientId = searchParams.get('recipient') || ''
  
  const { socket } = useSocket()
  const { data: session } = useSession()
  
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(
    isInitiator ? CALL_STATUS.CALLING : CALL_STATUS.RINGING
  )
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(type === CALL_TYPE.AUDIO)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // Lấy thông tin người nhận
  useEffect(() => {
    if (!socket || !recipientId) return
    
    socket.emit(SOCKET_EVENTS.GET_USER_INFO, { userId: recipientId }, (response: any) => {
      if (response.success) {
        setRecipientInfo(response.data)
      }
    })
  }, [socket, recipientId])

  // Thiết lập kết nối WebRTC
  useEffect(() => {
    if (!socket || !chatId) return
    
    const initializeCall = async () => {
      try {
        // Cấu hình ICE servers
        const configuration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
        
        // Tạo peer connection
        peerConnectionRef.current = new RTCPeerConnection(configuration)
        
        // Lấy stream từ camera và microphone
        const constraints = {
          audio: true,
          video: type === CALL_TYPE.VIDEO
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream
        
        // Hiển thị video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        
        // Thêm tracks vào peer connection
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        // Add audio tracks first
        audioTracks.forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream);
        });

        // Then add video tracks
        videoTracks.forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
        
        // Xử lý khi nhận được remote tracks
        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setCallStatus(CALL_STATUS.CONNECTED)
          }
        }
        
        // Xử lý ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
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
    
    // Xử lý các sự kiện socket
    const handleOffer = async (data: any) => {
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
    
    const handleAnswer = async (data: any) => {
      if (!peerConnectionRef.current) return
      
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      } catch (error) {
        console.error('Error handling answer:', error)
      }
    }
    
    const handleIceCandidate = async (data: any) => {
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
      setTimeout(() => window.close(), 2000)
    }
    
    const handleCallEnded = () => {
      setCallStatus(CALL_STATUS.ENDED)
      toast.info('Cuộc gọi đã kết thúc')
      setTimeout(() => window.close(), 2000)
    }
    
    socket.on(SOCKET_EVENTS.SDP_OFFER, handleOffer)
    socket.on(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
    socket.on(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
    socket.on(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
    
    return () => {
      socket.off(SOCKET_EVENTS.SDP_OFFER, handleOffer)
      socket.off(SOCKET_EVENTS.SDP_ANSWER, handleAnswer)
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate)
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted)
      socket.off(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected)
      socket.off(SOCKET_EVENTS.CALL_ENDED, handleCallEnded)
      
      // Dọn dẹp
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      screenStreamRef.current?.getTracks().forEach(track => track.stop())
      peerConnectionRef.current?.close()
    }
  }, [socket, chatId, recipientId, type, isInitiator])
  
  // Xử lý các hành động
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
    
    window.close()
  }
  
  const handleEndCall = () => {
    if (!socket) return
    
    socket.emit(SOCKET_EVENTS.CALL_ENDED, {
      chatId,
      recipientId
    })
    
    window.close()
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
    if (!localStreamRef.current || type === CALL_TYPE.AUDIO) return
    
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

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex-1 bg-black relative">
        {/* Video của người nhận */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${
            callStatus !== CALL_STATUS.CONNECTED && 'hidden'
          }`}
        />
        
        {/* Hiển thị trạng thái cuộc gọi */}
        {callStatus !== CALL_STATUS.CONNECTED && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Avatar className="w-32 h-32 mb-4">
              <AvatarImage src={recipientInfo?.avatar} />
              <AvatarFallback>
                {recipientInfo?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-white mb-2">
              {recipientInfo?.name || 'Đang kết nối...'}
            </h2>
            <p className="text-gray-300">
              {callStatus === CALL_STATUS.RINGING && 'Đang gọi đến...'}
              {callStatus === CALL_STATUS.CALLING && 'Đang đổ chuông...'}
              {callStatus === CALL_STATUS.CONNECTING && 'Đang kết nối...'}
              {callStatus === CALL_STATUS.REJECTED && 'Cuộc gọi bị từ chối'}
              {callStatus === CALL_STATUS.ENDED && 'Cuộc gọi đã kết thúc'}
            </p>
          </div>
        )}
        
        {/* Video của bản thân (nhỏ ở góc) */}
        <div className="absolute bottom-4 right-4 w-1/4 max-w-[200px] h-[150px] rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              (type === CALL_TYPE.AUDIO || isCameraOff) && 'hidden'
            }`}
          />
          {(type === CALL_TYPE.AUDIO || isCameraOff) && (
            <div className="bg-gray-800 w-full h-full flex items-center justify-center">
              <Avatar className="w-16 h-16">
                <AvatarImage src={session?.user?.avatar || ''} />
                <AvatarFallback>{session?.user?.name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
      
      {/* Thanh điều khiển */}
      <div className="p-6 bg-gray-800 flex items-center justify-center gap-6">
        {!isInitiator && callStatus === CALL_STATUS.RINGING ? (
          <>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-14 w-14"
              onClick={handleRejectCall}
            >
              <Phone className="h-6 w-6 rotate-135" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
              onClick={handleAcceptCall}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isMuted ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            
            {type === CALL_TYPE.VIDEO && (
              <Button
                variant={isCameraOff ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={toggleCamera}
              >
                {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            )}
            
            {type === CALL_TYPE.VIDEO && (
              <Button
                variant={isScreenSharing ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={toggleScreenSharing}
              >
                <Monitor className="h-6 w-6" />
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={handleEndCall}
            >
              <Phone className="h-6 w-6 rotate-135" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
