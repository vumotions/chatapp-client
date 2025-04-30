import { Skeleton } from '~/components/ui/skeleton'

export default function FormAppearanceSkeleton() {
  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-10 w-[200px] rounded-md' />
        <Skeleton className='h-3 w-[250px]' />
      </div>

      <div className='space-y-2'>
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-3 w-[250px]' />
        <div className='grid max-w-md gap-8 py-4 min-[420px]:grid-cols-2'>
          <div className='w-full space-y-2'>
            <Skeleton className='h-[150px] rounded-md' />
            <Skeleton className='mx-auto h-4 w-10' />
          </div>
          <div className='w-full space-y-2'>
            <Skeleton className='h-[150px] rounded-md' />
            <Skeleton className='mx-auto h-4 w-10' />
          </div>
        </div>
      </div>

      <Skeleton className='h-10 w-[150px] rounded-md' />
    </div>
  )
}
