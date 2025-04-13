'use client'

import { ProgressProvider } from '@bprogress/next/app'

const BProgressProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProgressProvider height='2px' color='#ffffff' options={{ showSpinner: false }} shallowRouting>
      {children}
    </ProgressProvider>
  )
}

export default BProgressProvider
