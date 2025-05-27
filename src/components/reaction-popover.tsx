'use client'

import { Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

interface ReactionPopoverProps {
  message: any
  onReact: (type: string) => void
}

function ReactionPopover({ message, onReact }: ReactionPopoverProps) {
  const reactions = ['❤️', '👍', '👎', '😂', '😮', '😢', '😡']

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className='bg-muted hover:bg-muted/80 flex items-center rounded-full p-1.5'>
          <Plus className='h-3.5 w-3.5' />
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-2' side='top'>
        <div className='flex gap-2'>
          {reactions.map((reaction) => (
            <button
              key={reaction}
              className='hover:bg-muted rounded-full p-1.5 text-lg transition-colors'
              onClick={() => onReact(reaction)}
            >
              {reaction}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ReactionPopover
