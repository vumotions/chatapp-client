import { X } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useRef } from 'react'
import { Button } from '~/components/ui/button'

interface MediaLightboxProps {
  url: string
  isOpen: boolean
  onClose: () => void
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i)

  useEffect(() => {
    if (isOpen && isVideo && videoRef.current) {
      videoRef.current.load()

      const playPromise = videoRef.current.play()

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Auto-play was prevented:', error)
        })
      }
    }
  }, [isOpen, url, isVideo])

  if (!isOpen || !url) return null

  return (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/80' onClick={onClose}>
      <div className='relative max-h-[90vh] max-w-[90vw]'>
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
          <Image
            src={url}
            alt='Media preview'
            width={1200}
            height={900}
            className='max-h-[90vh] max-w-[90vw] object-contain'
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Nút đóng với màu thích ứng với theme */}
        <Button
          size={'icon'}
          variant={'secondary'}
          className='bg-secondary/80 text-secondary-foreground hover:bg-secondary/100 border-border absolute top-4 right-4 rounded-full border shadow-lg backdrop-blur-sm'
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className='h-6 w-6' />
          <span className='sr-only'>Đóng</span>
        </Button>
      </div>
    </div>
  )
}

export default MediaLightbox
