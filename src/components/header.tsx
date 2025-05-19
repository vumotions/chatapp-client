'use client'
import { HomeIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Fragment } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import useMediaQuery from '~/hooks/use-media-query'
import { Link } from '~/i18n/navigation'
import HeaderSearch from './header-search'
import MessagePopover from './message-popover'
import NavLink from './nav-link'
import NotificationPopover from './notification-popover'
import { Button, buttonVariants } from './ui/button'
import UserPopover from './user-popover'
import { Skeleton } from './ui/skeleton'
import Logo from './logo'

function Header() {
  const { data: session, status } = useSession()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isLoading = status === 'loading'

  return (
    <header className='bg-background sticky top-0 z-50 flex h-16 w-full items-center border-b'>
      <div className='flex w-full items-center justify-between gap-2 px-4 py-2'>
        <div className='flex items-center gap-4 md:gap-8'>
          <Link href={'/'} className='h-8 w-8'>
            <Logo width={24} height={28} />
          </Link>
          {!isMobile && <HeaderSearch />}
        </div>
        <div className='flex items-center gap-2 md:gap-4'>
          {isMobile && <HeaderSearch />}

          {isLoading ? (
            <div className='flex items-center gap-2 md:gap-4'>
              <Skeleton className='h-9 w-20 rounded-md' />
              <Skeleton className='h-9 w-20 rounded-md' />
            </div>
          ) : session ? (
            <Fragment>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink href={'/'}>
                    <Button variant='ghost' size='icon' className='bg-accent relative cursor-pointer rounded-full p-2'>
                      <HomeIcon className='size-5' />
                    </Button>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side='left' className='flex items-center gap-4'>
                  Home
                </TooltipContent>
              </Tooltip>

              <NotificationPopover />
              <MessagePopover />
              <UserPopover />
            </Fragment>
          ) : (
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
