import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

function Layout({ children }: Props) {
  return <div className='mx-auto w-full max-w-[1000px] px-4 py-5'>{children}</div>
}

export default Layout
