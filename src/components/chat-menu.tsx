'use client'

import { MessageCircle, Settings } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
        <Link href={'/messages'}>
          <DropdownMenuItem>chat 1</DropdownMenuItem>
        </Link>
        <Link href={'/messages'}>
          <DropdownMenuItem>chat 2</DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ChatMenu
