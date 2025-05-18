'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import useOnline from '~/hooks/use-online'
import { cn } from '~/lib/utils'

export function NetworkStatus() {
  const isOnline = useOnline()
  const [showOfflineWarning, setShowOfflineWarning] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      // Khi mất kết nối, hiển thị cảnh báo
      setShowOfflineWarning(true)
      setWasOffline(true)
      toast.error('Mất kết nối mạng. Một số tính năng có thể không hoạt động.', {
        id: 'network-offline',
        duration: Infinity,
        position: 'top-left'
      })
    } else if (wasOffline) {
      // Khi kết nối lại sau khi mất kết nối
      toast.success('Đã kết nối lại mạng!', {
        id: 'network-online',
        position: 'top-left'
      })
      // Đóng toast offline
      toast.dismiss('network-offline')
      // Ẩn cảnh báo sau 3 giây
      setTimeout(() => {
        setShowOfflineWarning(false)
        setWasOffline(false)
      }, 3000)
    }
  }, [isOnline, wasOffline])

  if (!showOfflineWarning && isOnline) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300',
        isOnline
          ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
      )}
    >
      {isOnline ? (
        <>
          <Wifi className='h-4 w-4' />
          <span>Đã kết nối lại</span>
        </>
      ) : (
        <>
          <WifiOff className='h-4 w-4' />
          <span>Mất kết nối mạng</span>
        </>
      )}
    </div>
  )
}

export function NetworkStatusIndicator() {
  const isOnline = useOnline()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='relative cursor-pointer'>
          {isOnline ? <Wifi className='h-5 w-5 text-green-500' /> : <WifiOff className='text-destructive h-5 w-5' />}
          <span
            className={cn(
              'absolute -right-1 -bottom-1 h-2 w-2 rounded-full',
              isOnline ? 'bg-green-500' : 'bg-destructive',
              'animate-pulse'
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side='right'>{isOnline ? 'Kết nối mạng ổn định' : 'Mất kết nối mạng'}</TooltipContent>
    </Tooltip>
  )
}
