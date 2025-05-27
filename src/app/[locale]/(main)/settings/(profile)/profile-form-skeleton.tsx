import { Skeleton } from '~/components/ui/skeleton'

export default function ProfileFormSkeleton() {
  return (
    <div className='space-y-8'>
      {/* Cover Photo Skeleton */}
      <div className='space-y-0'>
        <div className='bg-muted relative h-48 w-full overflow-hidden rounded-lg'>
          <Skeleton className='h-full w-full' />
        </div>
      </div>

      {/* Avatar Skeleton - Đặt ở vị trí đè lên ảnh bìa */}
      <div className='-mt-16 ml-6'>
        <div className='relative w-fit'>
          <Skeleton className='border-background h-28 w-28 rounded-full border-4 shadow-md' />
        </div>
      </div>

      {/* Thông tin người dùng */}
      <div className='mt-2 ml-6'>
        <Skeleton className='mb-2 h-6 w-48' />
        <Skeleton className='mb-1 h-4 w-32' />
        <Skeleton className='h-4 w-64' />
      </div>

      {/* Tên hiển thị */}
      <div className='space-y-2'>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-10 w-full rounded-md' />
        <Skeleton className='h-4 w-3/4' />
      </div>

      {/* Username */}
      <div className='space-y-2'>
        <Skeleton className='h-5 w-24' />
        <Skeleton className='h-10 w-full rounded-md' />
        <Skeleton className='h-4 w-3/4' />
      </div>

      {/* Bio */}
      <div className='space-y-2'>
        <Skeleton className='h-5 w-20' />
        <Skeleton className='h-24 w-full rounded-md' />
        <Skeleton className='h-4 w-3/4' />
      </div>

      {/* Ngày sinh */}
      <div className='space-y-2'>
        <Skeleton className='h-5 w-24' />
        <div className='grid grid-cols-3 gap-3'>
          <Skeleton className='h-10 w-full rounded-md' />
          <Skeleton className='h-10 w-full rounded-md' />
          <Skeleton className='h-10 w-full rounded-md' />
        </div>
        <Skeleton className='h-4 w-3/4' />
      </div>

      {/* Buttons */}
      <div className='flex items-center gap-4'>
        <Skeleton className='h-10 w-32 rounded-md' />
        <Skeleton className='h-10 w-40 rounded-md' />
      </div>
    </div>
  )
}
