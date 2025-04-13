import { Metadata } from 'next'
import Image from 'next/image'

import { SidebarNav } from '~/components/sidebar-nav'
import { Separator } from '~/components/ui/separator'

export const metadata: Metadata = {
  title: 'Forms',
  description: 'Advanced form example using react-hook-form and Zod.'
}

const sidebarNavItems = [
  {
    title: 'Profile',
    href: '/settings'
  },
  {
    title: 'Account',
    href: '/settings/account'
  },
  {
    title: 'Appearance',
    href: '/settings/appearance'
  },
  {
    title: 'Notifications',
    href: '/settings/notifications'
  },
  {
    title: 'Display',
    href: '/settings/display'
  }
]

interface Props {
  children: React.ReactNode
}

export default function layout({ children }: Props) {
  return (
    <div className='space-y-6 p-10 pb-16'>
      <div className='space-y-0.5'>
        <h2 className='text-2xl font-bold tracking-tight'>Settings</h2>
        <p className='text-muted-foreground'>Manage your account settings and set e-mail preferences.</p>
      </div>
      <Separator className='my-6' />
      <div className='flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12'>
        <aside className='lg:w-1/5'>
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className='flex-1 lg:max-w-2xl'>{children}</div>
      </div>
    </div>
  )
}
