'use client'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useSession } from 'next-auth/react'
import { Label } from '~/components/ui/label'
import useMediaQuery from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import { Button } from './ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'

function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: session } = useSession()
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsOpen(false)
    }
  }

  const handleItemSelect = (value: string) => {
    router.push(value)
    setIsOpen(false)
  }

  // Hiển thị icon tròn trên mobile, form search trên desktop
  if (isMobile && session) {
    return (
      <>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full bg-accent"
          onClick={() => setIsOpen(true)}
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Search</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Command className="rounded-lg border shadow-md">
                <form onSubmit={handleSearch}>
                  <CommandInput 
                    placeholder="Search for anything..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="h-9"
                  />
                </form>
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => handleItemSelect('/messages')}>
                      <Search className="mr-2 h-4 w-4" />
                      <span>Messages</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleItemSelect('/friends')}>
                      <Search className="mr-2 h-4 w-4" />
                      <span>Friends</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleItemSelect('/settings')}>
                      <Search className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Desktop version
  return (
    <form onSubmit={handleSearch} className={cn({
      'hidden':!session
    })}>
      <div className='relative w-full min-w-64'>
        <Label htmlFor='search' className='sr-only'>
          Search
        </Label>
        <Input 
          id='search' 
          placeholder='Type to search...' 
          className='rounded-full pl-7' 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className='pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none' />
      </div>
    </form>
  )
}

export default HeaderSearch
