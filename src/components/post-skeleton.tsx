import { Card, CardContent } from './ui/card'
import { Skeleton } from './ui/skeleton'

function PostSkeleton() {
  return (
    <Card>
      <CardContent className='space-y-3 px-4'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='space-y-1'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-3 w-24' />
          </div>
        </div>
        <Skeleton className='h-28 w-full' />
        <div className='flex justify-evenly border-t pt-2'>
          <Skeleton className='h-6 w-10' />
          <Skeleton className='h-6 w-10' />
          <Skeleton className='h-6 w-10' />
          <Skeleton className='h-6 w-10' />
        </div>
      </CardContent>
    </Card>
  )
}

export default PostSkeleton
