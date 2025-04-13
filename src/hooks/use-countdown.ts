import { useEffect, useRef, useState } from 'react'

function useCountdown(epoch?: number): {
  isTimeout: boolean
  time: number
  setCountdown: (epochTime: number) => void
} {
  const [time, setTime] = useState<number>(() => {
    const now = Date.now()
    if (epoch && now < epoch) {
      return Math.floor((epoch - Date.now()) / 1000)
    }
    return 0
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (time > 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)

      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [time])

  const setCountdown = (epochTime: number) => {
    const seconds = Math.floor((epochTime - Date.now()) / 1000)
    setTime(seconds)
  }

  return {
    time,
    isTimeout: time <= 0,
    setCountdown
  }
}

export default useCountdown
