import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

function Layout({ children }: Props) {
  return (
    <div className='mx-auto w-full max-w-[1000px] overflow-hidden px-4 py-5'>
      <div>{children}</div>
    </div>
  )
}

export default Layout
