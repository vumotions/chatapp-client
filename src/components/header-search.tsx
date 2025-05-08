import { Search } from 'lucide-react'

import { Label } from '~/components/ui/label'
import { Input } from './ui/input'

function HeaderSearch() {
  return (
    <form>
      <div className='relative w-full min-w-64'>
        <Label htmlFor='search' className='sr-only'>
          Search
        </Label>
        <Input id='search' placeholder='Type to search...' className='rounded-full pl-7' />
        <Search className='pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none' />
      </div>
    </form>
  )
}

export default HeaderSearch
