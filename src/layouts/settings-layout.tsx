import { Metadata } from 'next'

import { SidebarNav } from '~/components/sidebar-nav'
import { Separator } from '~/components/ui/separator'
import { LayoutProps } from '~/types/props.types'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences.'
}

const sidebarNavItems = [
  {
    title: 'Profile',
    href: '/settings'
  },
  {
    title: 'Account',
    href: '/settings/account',
    description: 'Update account settings and appearance preferences'
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    disabled: true,
    badge: 'Coming soon'
  }
]

function SettingsLayout({ children }: LayoutProps) {
  return (
    <div className='space-y-6 p-10 pb-16'>
      <div className='space-y-0.5'>
        <h2 className='text-2xl font-bold tracking-tight'>Settings</h2>
        <p className='text-muted-foreground'>Manage your account settings and preferences.</p>
      </div>
      <Separator className='my-6' />
      <div className='flex flex-col justify-center space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12'>
        <aside className='lg:w-1/5'>
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className='flex-1 lg:max-w-2xl'>{children}</div>
      </div>
    </div>
  )
}

export default SettingsLayout
