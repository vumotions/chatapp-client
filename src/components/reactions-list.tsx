'use client'

import { Heart } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

interface ReactionsListProps {
  reactions: any[]
}

function ReactionsList({ reactions }: ReactionsListProps) {
  if (!reactions || reactions.length === 0) return null
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="bg-muted flex items-center rounded-full px-2 py-0.5 text-xs cursor-pointer">
          <Heart className="h-3 w-3 mr-1" />
          <span>{reactions.length}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" side="top">
        <div className="py-2">
          <h4 className="px-3 py-1 text-sm font-medium">Reactions</h4>
          <div className="max-h-40 overflow-y-auto">
            {reactions.map((reaction, index) => {
              const user = typeof reaction.userId === 'object' ? reaction.userId : { name: 'User', avatar: '' }
              
              return (
                <div key={index} className="flex items-center px-3 py-2 hover:bg-muted">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name}</span>
                  <span className="ml-auto">{reaction.type}</span>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ReactionsList