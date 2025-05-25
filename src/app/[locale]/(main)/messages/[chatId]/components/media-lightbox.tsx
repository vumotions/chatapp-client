import { X } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

interface MediaLightboxProps {
  url: string
  isOpen: boolean
  onClose: () => void
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Kiểm tra xem URL có phải là video không
  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i)
  
  // Xử lý khi component mount hoặc url thay đổi
  useEffect(() => {
    if (isOpen && isVideo && videoRef.current) {
      // Đảm bảo video được load lại khi URL thay đổi
      videoRef.current.load()
      
      // Thử phát video sau khi load
      const playPromise = videoRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Auto-play was prevented:', error)
          // Hiển thị nút play cho người dùng click
        })
      }
    }
  }, [isOpen, url, isVideo])

  if (!isOpen || !url) return null

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80'
      onClick={onClose}
    >
      <div className='max-h-[90vh] max-w-[90vw]'>
        {isVideo ? (
          <video
            ref={videoRef}
            src={url}
            className='max-h-[90vh] max-w-[90vw]'
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              console.error('Lightbox video error:', e)
              // Thử tải lại video nếu có lỗi
              const video = e.currentTarget
              video.src = url
            }}
          />
        ) : (
          <img
            src={url}
            alt='Media preview'
            className='max-h-[90vh] max-w-[90vw] object-contain'
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <button
          className='absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70'
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className='h-6 w-6' />
        </button>
      </div>
    </div>
  )
}

export default MediaLightbox



