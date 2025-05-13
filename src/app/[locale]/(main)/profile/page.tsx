'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

function MyProfile() {
  const { data: session } = useSession()
  useEffect(() => {
    if (session?.user?.username) {
      redirect(`/profile/${session.user.username}`)
    }
  }, [session])
  return null
}

export default MyProfile
