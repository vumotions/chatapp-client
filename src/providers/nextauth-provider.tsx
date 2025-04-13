'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

function NextAuthProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>
}

export default NextAuthProvider
