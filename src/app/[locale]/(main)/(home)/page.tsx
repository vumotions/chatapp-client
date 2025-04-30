'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Link } from '~/i18n/navigation'

export default function Home() {
  const router = useRouter()
  return <div></div>
}
