import { Skeleton } from '~/components/ui/skeleton'

export default function FriendSuggestionItemSkeleton() {
  return (
    <div className='h-full px-2'>
      <div className='bg-card flex h-full flex-col items-center gap-2 rounded-lg border p-4 shadow-sm'>
        <Skeleton className='h-16 w-16 rounded-full' />
        <div className='w-full text-center'>
          <Skeleton className='mx-auto mb-1 h-5 w-24' />
          <Skeleton className='mx-auto h-4 w-16' />
        </div>
        <div className='flex-grow' />
        <div className='mt-2 flex w-full flex-col gap-2'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    </div>
  )
}
