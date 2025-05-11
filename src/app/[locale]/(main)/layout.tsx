import MainLayout from '~/layouts/main-layout'
import { LayoutProps } from '~/types/props.types'
import NotificationListener from '~/components/notification-listener'

function Layout({ children }: LayoutProps) {
  return (
    <MainLayout>
      <NotificationListener />
      {children}
    </MainLayout>
  )
}

export default Layout
