import MessageLayout from '~/layouts/message-layout'
import { LayoutProps } from '~/types/props.types'

function Layout({ children }: LayoutProps) {
  return <MessageLayout>{children}</MessageLayout>
}

export default Layout
