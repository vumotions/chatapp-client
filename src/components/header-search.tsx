'use client'
import { Loader2, Search, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useSearchUsers } from '~/hooks/data/user.hooks'
import useMediaQuery from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from './ui/command'
import { Input } from './ui/input'

function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { data: session } = useSession()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const router = useRouter()

  // Sử dụng hook tìm kiếm người dùng
  const { searchQuery, users, isLoading, handleSearchChange, setSearchQuery } = useSearchUsers()

  // Xử lý khi chọn một item
  const handleNavigate = (path: string) => {
    if (!isPending) {
      startTransition(() => {
        setIsOpen(false)
        router.push(path)
        setSearchQuery('')
      })
    }
  }

  // Hiển thị icon tròn trên mobile, form search trên desktop
  if (isMobile && session) {
    return (
      <>
        <Button
          variant='ghost'
          size='icon'
          className='bg-accent rounded-full'
          onClick={() => !isPending && setIsOpen(true)}
          disabled={isPending}
        >
          <Search className='h-5 w-5' />
          <span className='sr-only'>Search</span>
        </Button>

        <CommandDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!isPending) {
              setIsOpen(open)
            }
          }}
        >
          <Command className='rounded-lg border shadow-md'>
            <div className='flex items-center border-b px-3'>
              <CommandInput
                placeholder='Search for users or pages...'
                value={searchQuery}
                onValueChange={handleSearchChange}
                disabled={isPending}
                className='flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50'
              />
            </div>
            <CommandList className='max-h-[300px] overflow-y-auto'>
              {isLoading ? (
                <div className='flex items-center justify-center py-6'>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  <span>Searching...</span>
                </div>
              ) : users.length === 0 && searchQuery.trim() !== '' ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : (
                <>
                  {/* Hiển thị kết quả tìm kiếm người dùng */}
                  {users.length > 0 && (
                    <CommandGroup heading='Users'>
                      {users.map((user) => (
                        <CommandItem
                          key={user._id}
                          value={`/profile/${user.username || user._id}`}
                          className='flex cursor-pointer items-center'
                          disabled={isPending}
                          onSelect={() => handleNavigate(`/profile/${user.username || user._id}`)}
                        >
                          <Avatar className='mr-2 h-6 w-6'>
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  <CommandGroup heading='Pages'>
                    <CommandItem
                      value='/messages'
                      className='cursor-pointer'
                      disabled={isPending}
                      onSelect={() => handleNavigate('/messages')}
                    >
                      <Search className='mr-2 h-4 w-4' />
                      <span>Messages</span>
                    </CommandItem>
                    <CommandItem
                      value='/friends'
                      className='cursor-pointer'
                      disabled={isPending}
                      onSelect={() => handleNavigate('/friends')}
                    >
                      <User className='mr-2 h-4 w-4' />
                      <span>Friends</span>
                    </CommandItem>
                    <CommandItem
                      value='/settings'
                      className='cursor-pointer'
                      disabled={isPending}
                      onSelect={() => handleNavigate('/settings')}
                    >
                      <Search className='mr-2 h-4 w-4' />
                      <span>Settings</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </CommandDialog>
      </>
    )
  }

  // Desktop version
  return (
    <div
      className={cn({
        hidden: !session,
        'relative w-full min-w-64': true
      })}
    >
      <div className='relative w-full'>
        <form className='relative' onSubmit={(e) => e.preventDefault()}>
          {isPending ? (
            <Loader2 className='absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 animate-spin opacity-50' />
          ) : (
            <Search className='pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 opacity-50' />
          )}
          <Input
            type='text'
            placeholder='Search users or pages...'
            className='bg-background w-full rounded-full border px-9 py-2 text-sm focus-visible:outline-none'
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            disabled={isPending}
          />
        </form>

        {searchQuery.length > 0 && !isPending && (
          <div className='absolute top-full right-0 left-0 z-50 mt-1'>
            <Command className='bg-popover rounded-md border shadow-md'>
              <CommandList className='max-h-[300px] overflow-y-auto py-2'>
                {isLoading ? (
                  <div className='flex items-center justify-center py-2'>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    <span>Searching...</span>
                  </div>
                ) : users.length === 0 ? (
                  <CommandEmpty>No results found.</CommandEmpty>
                ) : (
                  <>
                    {/* Hiển thị kết quả tìm kiếm người dùng */}
                    {users.length > 0 && (
                      <CommandGroup heading='Users'>
                        {users.map((user) => (
                          <CommandItem
                            key={user._id}
                            value={`/profile/${user.username || user._id}`}
                            className='flex cursor-pointer items-center'
                            disabled={isPending}
                            onSelect={() => handleNavigate(`/profile/${user.username || user._id}`)}
                          >
                            <Avatar className='mr-2 h-6 w-6'>
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    <CommandGroup heading='Pages'>
                      <CommandItem
                        value='/messages'
                        className='cursor-pointer'
                        disabled={isPending}
                        onSelect={() => handleNavigate('/messages')}
                      >
                        <Search className='mr-2 h-4 w-4' />
                        <span>Messages</span>
                      </CommandItem>
                      <CommandItem
                        value='/friends'
                        className='cursor-pointer'
                        disabled={isPending}
                        onSelect={() => handleNavigate('/friends')}
                      >
                        <User className='mr-2 h-4 w-4' />
                        <span>Friends</span>
                      </CommandItem>
                      <CommandItem
                        value='/settings'
                        className='cursor-pointer'
                        disabled={isPending}
                        onSelect={() => handleNavigate('/settings')}
                      >
                        <Search className='mr-2 h-4 w-4' />
                        <span>Settings</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  )
}

export default HeaderSearch
