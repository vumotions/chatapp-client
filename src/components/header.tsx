'use client'

import { HomeIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Fragment } from 'react'
import { Link } from '~/i18n/navigation'
import HeaderSearch from './header-search'
import MessagePopover from './message-popover'
import NavLink from './nav-link'
import NotificationPopover from './notification-popover'
import { buttonVariants } from './ui/button'
import UserPopover from './user-popover'

function Header() {
  const { data: session } = useSession()
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
              <NavLink href={'/'} className='bg-accent cursor-pointer rounded-full p-2'>
                <HomeIcon className='size-5' />
              </NavLink>
              <NotificationPopover />
              <MessagePopover />
              <UserPopover />
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
