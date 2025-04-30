import { getServerSession } from 'next-auth'
import { Fragment } from 'react'
import { Link } from '~/i18n/navigation'
import ChatMenu from './chat-menu'
import HeaderSearch from './header-search'
import NavUser from './nav-user'
import NotificationMenu from './notification-menu'
import { buttonVariants } from './ui/button'

async function Header() {
  const session  = await getServerSession()

  return (
    <header className='bg-background sticky top-0 z-50 flex h-16 w-full items-center border-b'>
      <div className='flex w-full items-center justify-between gap-2 px-4 py-2'>
        <div className='flex items-center gap-8'>
          <Link href={'/'} className='h-8 w-8'>
            Logo
          </Link>
          <HeaderSearch />
        </div>
        <div className='flex items-center gap-4'>
          {session && (
            <Fragment>
              <NotificationMenu />
              <ChatMenu />
              <NavUser />
            </Fragment>
          )}

          {!session && (
            <Fragment>
              <Link
                href='/auth/login'
                className={buttonVariants({
                  variant: 'outline'
                })}
              >
                Sign in
              </Link>
              <Link
                href='/auth/register'
                className={buttonVariants({
                  variant: 'default'
                })}
              >
                Sign Up
              </Link>
            </Fragment>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
