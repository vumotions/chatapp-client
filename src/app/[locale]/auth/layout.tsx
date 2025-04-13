import Image from 'next/image'
import { ReactNode } from 'react'
import icons from '~/assets/icons'
import { Link } from '~/i18n/navigation'

type Props = {
  children: ReactNode
}

function Layout({ children }: Props) {
  return (
    <div className='flex h-full items-center justify-center'>
      <div className='relative container flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2'>
        <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
          <div className='absolute inset-0 bg-zinc-900' />
          <Image src={icons.logo} alt='Logo' className='z-20' />
          <div className='relative z-20 mt-auto'>
            <blockquote className='space-y-2'>
              <p className='text-lg'>
                &ldquo;This app makes it so easy to stay connected with my team and friends. Messaging feels instant and
                natural — it's like everyone's always just a tap away.&rdquo;
              </p>
              <footer className='text-sm'>Vu Motions</footer>
            </blockquote>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Layout
