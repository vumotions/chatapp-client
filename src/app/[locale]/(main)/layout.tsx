import GroupEventsListener from '~/components/group-events-listener'
import NotificationListener from '~/components/notification-listener'
import MainLayout from '~/layouts/main-layout'
import { LayoutProps } from '~/types/props.types'
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
