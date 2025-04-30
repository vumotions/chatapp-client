import { ReactNode } from 'react'
import AuthLayout from '~/layouts/auth-layout'

type Props = {
  children: ReactNode
}

function Layout({ children }: Props) {
  return <AuthLayout>{children}</AuthLayout>
}

export default Layout
