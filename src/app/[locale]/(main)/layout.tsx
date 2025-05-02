import MainLayout from '~/layouts/main-layout'
import { LayoutProps } from '~/types/props.types'

function Layout({ children }: LayoutProps) {
  return <MainLayout>{children}</MainLayout>
}

export default Layout
