import { Heart } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { useTooltipsTranslation } from '~/hooks/use-translations'

interface MessageReactionProps {
  isLiked: boolean
  onToggleLike: () => void
  className?: string
}

export function MessageReaction({ isLiked, onToggleLike, className }: MessageReactionProps) {
  const tooltipsT = useTooltipsTranslation()
  
  return (
    <Button
      variant='ghost'
      size='icon'
      className={cn('h-8 w-8 rounded-full', className)}
      onClick={(e) => {
        e.stopPropagation()
        onToggleLike()
      }}
    >
      <Heart className={cn('h-4 w-4 transition-colors', isLiked ? 'fill-red-500 text-red-500' : '')} />
      <span className='sr-only'>{isLiked ? tooltipsT('unlike') : tooltipsT('like')}</span>
    </Button>
  )
}





