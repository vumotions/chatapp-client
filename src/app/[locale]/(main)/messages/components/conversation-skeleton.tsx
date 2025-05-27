'use client'

import { Skeleton } from '~/components/ui/skeleton'

export function ConversationSkeleton() {
  return (
    <div className='mb-2 flex items-center space-x-4 rounded-md p-2'>
      <Skeleton className='h-12 w-12 rounded-full' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
      </div>
    </div>
  )
}
