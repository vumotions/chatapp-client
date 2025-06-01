import { Metadata } from 'next'
import { useTranslations } from 'next-intl'

import { SidebarNav } from '~/components/sidebar-nav'
import { Separator } from '~/components/ui/separator'
import { LayoutProps } from '~/types/props.types'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences.'
}

function SettingsLayout({ children }: LayoutProps) {
  const t = useTranslations('settings')

  const sidebarNavItems = [
    {
      title: t('sidebar.profile'),
      href: '/settings'
    },
    {
      title: t('sidebar.account'),
      href: '/settings/account',
      description: t('sidebar.accountDescription')
    },
    {
      title: t('sidebar.notifications'),
      href: '/settings/notifications',
      disabled: true,
      badge: t('sidebar.comingSoon')
    }
  ]

  return (
    <div className='space-y-4 p-4 pt-8 pb-16 lg:space-y-6 lg:p-10'>
      <div className='space-y-0.5'>
        <h2 className='text-2xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
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
