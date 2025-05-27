import { Skeleton } from '~/components/ui/skeleton'
import { Separator } from '~/components/ui/separator'

export default function AccountSkeleton() {
  return (
    <div className='space-y-8'>
      {/* Email section */}
      <div className='space-y-4'>
        <div>
          <Skeleton className='mb-2 h-5 w-12' />
          <div className='flex items-center gap-2'>
            <Skeleton className='h-5 w-48' />
            <Skeleton className='h-5 w-20 rounded-full' />
          </div>
          <div className='mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <Skeleton className='h-4 w-64' />
            <Skeleton className='h-9 w-40 rounded-md' />
          </div>
        </div>
      </div>

      <Separator />

      {/* Language section */}
      <div>
        <Skeleton className='mb-2 h-6 w-24' />
        <Skeleton className='mb-6 h-4 w-full max-w-md' />

        <div className='space-y-8'>
          <div className='flex flex-col'>
            <Skeleton className='mb-2 h-5 w-20' />
            <Skeleton className='mb-2 h-10 w-[200px] rounded-md' />
            <Skeleton className='h-4 w-64' />
          </div>
        </div>
      </div>

      <Separator />

      {/* Appearance section */}
      <div>
        <Skeleton className='mb-2 h-6 w-32' />
        <Skeleton className='mb-6 h-4 w-full max-w-md' />

        <div className='space-y-8'>
          <div>
            <Skeleton className='mb-4 h-5 w-16' />
            <div className='grid max-w-[678px] gap-8 pt-2 min-[678px]:grid-cols-3'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='space-y-2'>
                  <div className='border-border rounded-md border p-1'>
                    <Skeleton className='aspect-[4/3] rounded-sm' />
                  </div>
                  <Skeleton className='mx-auto h-4 w-16' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <Skeleton className='h-10 w-36 rounded-md' />
    </div>
  )
}
