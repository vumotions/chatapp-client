import { useState, useEffect } from 'react'

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)
    const listener = () => setMatches(media.matches)

    media.addEventListener('change', listener)
    setMatches(media.matches)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

export default useMediaQuery
