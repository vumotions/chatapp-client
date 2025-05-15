import MainLayout from '~/layouts/main-layout'
import { LayoutProps } from '~/types/props.types'
import NotificationListener from '~/components/notification-listener'
import GroupEventsListener from '~/components/group-events-listener'

function Layout({ children }: LayoutProps) {
  return (
    <MainLayout>
      <NotificationListener />
      <GroupEventsListener />
      {children}
    </MainLayout>
  )
}

export default Layout
