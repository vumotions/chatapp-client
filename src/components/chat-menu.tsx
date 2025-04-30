'use client'

import { ChevronDown, LogOut, MessageCircle, Settings } from 'lucide-react'

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

function ChatMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span className='bg-accent cursor-pointer rounded-full p-2'>
          <MessageCircle className='size-5' />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-[--radix-dropdown-menu-trigger-width] min-w-80 rounded-lg'
        side='bottom'
        align='end'
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <Link href={'/settings'}>
            <DropdownMenuItem>
              <Settings />
              Settings
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>chat 1</DropdownMenuItem>
        <DropdownMenuItem>chat 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ChatMenu
