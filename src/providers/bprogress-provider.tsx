'use client'

import { ProgressProvider } from '@bprogress/next/app'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BProgressProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme()
  const color = theme === 'light' ? '#000000' : '#ffffff'

  return (
    <ProgressProvider height='2px' color={color} options={{ showSpinner: false }} shallowRouting>
      {children}
    </ProgressProvider>
  )
}

export default dynamic(() => Promise.resolve(BProgressProvider), {
  ssr: false
})
