import Header from '~/components/header'
import { LayoutProps } from '~/types/props'

function MainLayout({ children }: LayoutProps) {
  return (
    <div className='flex w-full flex-col'>
      <Header />
      {children}
    </div>
  )
}

export default MainLayout
