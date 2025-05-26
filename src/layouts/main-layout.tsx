'use client'

import Header from '~/components/header'
import { useSyncUserPreferences } from '~/hooks/use-sync-user-preferences'
import { LayoutProps } from '~/types/props.types'

function MainLayout({ children }: LayoutProps) {
  useSyncUserPreferences()
  return (
    <div className='flex w-full flex-col'>
      <Header />
      {children}
    </div>
  )
}

export default MainLayout
