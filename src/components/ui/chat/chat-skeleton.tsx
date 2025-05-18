import { Skeleton } from '~/components/ui/skeleton'

export default function ChatSkeleton() {
  return (
    <div className='flex h-[calc(100vh-64px)] flex-col space-y-4 p-4'>
      <Skeleton className='h-12 w-full' />
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-10 w-10 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-4 w-24' />
        </div>
      </div>
      <Skeleton className='h-full w-full grow rounded-md' />
      <div className='flex space-x-2'>
        <Skeleton className='h-10 w-full rounded-full' />
        <Skeleton className='h-10 w-10 rounded-full' />
      </div>
    </div>
  )
}
