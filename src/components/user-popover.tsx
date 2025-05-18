'use client'

import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Link, useRouter } from '~/i18n/navigation'

function UserPopover() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    setOpen(false)
    signOut()
  }
  const handleRedirectToMyProfile = () => {
    router.push(`/profile/${session?.user?.username}`)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='ghost' className='relative h-auto p-0 hover:bg-transparent focus-visible:ring-0'>
          <div className='relative flex items-center'>
            <Avatar className='h-8 w-8 rounded-full'>
              <AvatarImage src={session?.user?.avatar || undefined} alt={session?.user?.name || ''} />
              <AvatarFallback className='rounded-lg'>{session?.user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <ChevronDown className='bg-secondary border-background absolute -right-1 -bottom-1 size-4 rounded-full border-2' />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-64 min-w-56 rounded-lg p-0 shadow-md' sideOffset={8}>
        <div onClick={handleRedirectToMyProfile} role='button'>
          <div className='hover:bg-accent rounded-t-md p-3'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-8 w-8 rounded-full'>
                <AvatarImage src={session?.user?.avatar} alt={session?.user?.name || ''} />
                <AvatarFallback className='rounded-lg'>{session?.user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className='flex flex-col overflow-hidden text-sm leading-tight'>
                <span className='max-w-[150px] truncate font-semibold'>{session?.user?.name}</span>
                <span className='text-muted-foreground max-w-[150px] truncate text-xs'>{session?.user?.email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className='border-border border-t' />
        <div className='p-1'>
          <Link href='/settings' onClick={() => setOpen(false)}>
            <button className='hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm'>
              <Settings className='size-4' />
              Settings
            </button>
          </Link>
          <button
            onClick={handleLogout}
            className='hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm'
          >
            <LogOut className='size-4' />
            Log out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default UserPopover
