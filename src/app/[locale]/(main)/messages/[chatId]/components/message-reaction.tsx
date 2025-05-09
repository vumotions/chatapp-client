import { Heart } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'

interface MessageReactionProps {
  isLiked: boolean
  onToggleLike: () => void
  className?: string
}

export function MessageReaction({ isLiked, onToggleLike, className }: MessageReactionProps) {
  console.log('MessageReaction rendered with isLiked:', isLiked); // Thêm log để debug
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 rounded-full', className)}
      onClick={(e) => {
        e.stopPropagation();
        onToggleLike();
      }}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isLiked ? 'fill-red-500 text-red-500' : ''
        )}
      />
      <span className="sr-only">Like</span>
    </Button>
  )
}
