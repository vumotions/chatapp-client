import { Metadata } from 'next'

import SettingsLayout from '~/layouts/settings-layout'
import { LayoutProps } from '~/types/props.types'

export const metadata: Metadata = {
  title: 'Forms',
  description: 'Advanced form example using react-hook-form and Zod.'
}

function Layout({ children }: LayoutProps) {
  return <SettingsLayout>{children}</SettingsLayout>
}

export default Layout
