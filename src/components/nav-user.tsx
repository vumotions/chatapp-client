'use client'

import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { Link } from '~/i18n/navigation'

function NavUser() {
  const session = useSession()

  const handleLogout = () => {
    signOut()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className='relative'>
          <Avatar className='h-8 w-8 rounded-full'>
            <AvatarImage src={session.data?.user?.image || ''} alt={session.data?.user?.name || ''} />
            <AvatarFallback className='rounded-lg'>LV</AvatarFallback>
          </Avatar>
          <ChevronDown className='bg-secondary border-background absolute -right-1 -bottom-1 size-4 rounded-full border-2' />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
        side='bottom'
        align='end'
        sideOffset={4}
      >
        <Link href={`/profile/${'@lequangvu'}`}>
          <DropdownMenuLabel className='hover:bg-accent rounded-sm p-0 font-normal'>
            <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
              <Avatar className='h-8 w-8 rounded-full'>
                <AvatarImage src={session.data?.user?.image || ''} alt={session.data?.user?.name || ''} />
                <AvatarFallback className='rounded-lg'>{session.data?.user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 overflow-hidden text-left text-sm leading-tight'>
                <span className='max-w-56 truncate font-semibold'>{session.data?.user?.name}</span>
                <span className='max-w-56 truncate text-xs'>{session.data?.user?.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </Link>
        <DropdownMenuGroup>
          <Link href={'/settings'}>
            <DropdownMenuItem>
              <Settings />
              Settings
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavUser
