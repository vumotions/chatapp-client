import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

export default function ProfileSkeleton() {
  return (
    <div className='mx-auto my-6 max-w-7xl space-y-6 px-4'>
      {/* Cover + Avatar Skeleton */}
      <Card className='pt-0'>
        <div className='bg-muted h-48 rounded-t-md' />
        <CardContent className='-mt-12 flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-end'>
          <Skeleton className='h-28 w-28 rounded-full' />
          <div className='flex-1'>
            <Skeleton className='mb-2 h-6 w-32' />
            <Skeleton className='h-4 w-24' />
          </div>
          <div className='flex gap-2'>
            <Skeleton className='h-9 w-28 rounded-md' />
            <Skeleton className='h-9 w-36 rounded-md' />
          </div>
        </CardContent>
      </Card>

      {/* Main layout 2 columns */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {/* Left column */}
        <div className='space-y-4 md:col-span-1'>
          {/* Giới thiệu Skeleton */}
          <Card className='py-0'>
            <CardContent className='space-y-3 p-4'>
              <Skeleton className='h-5 w-24' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-4 w-2/3' />
              <Skeleton className='h-4 w-1/2' />
              <Skeleton className='h-9 w-full rounded-md' />
            </CardContent>
          </Card>

          {/* Ảnh Skeleton */}
          <Card className='py-0'>
            <CardContent className='space-y-3 p-4'>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-5 w-16' />
                <Skeleton className='h-4 w-24' />
              </div>
              <div className='grid grid-cols-3 gap-1'>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className='aspect-square rounded' />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bạn bè Skeleton */}
          <Card className='py-0'>
            <CardContent className='space-y-3 p-4'>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-5 w-16' />
                <Skeleton className='h-4 w-24' />
              </div>
              <Skeleton className='h-4 w-32' />
              <div className='grid grid-cols-3 gap-2'>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className='space-y-1'>
                    <Skeleton className='aspect-square rounded' />
                    <Skeleton className='mx-auto h-3 w-16' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className='space-y-4 md:col-span-2'>
          {/* Form status Skeleton */}
          <Card className='py-0'>
            <CardContent className='space-y-3 p-4'>
              <Skeleton className='h-10 w-full rounded-md' />
              <div className='flex flex-wrap gap-2'>
                <Skeleton className='h-8 w-28 rounded-md' />
                <Skeleton className='h-8 w-24 rounded-md' />
                <Skeleton className='h-8 w-20 rounded-md' />
              </div>
            </CardContent>
          </Card>

          {/* Bài viết Skeleton */}
          <Card className='py-0'>
            <CardContent className='space-y-3 p-4'>
              {/* Header */}
              <div className='flex items-center gap-3'>
                <Skeleton className='h-10 w-10 rounded-full' />
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-24' />
                </div>
              </div>
              {/* Content */}
              <Skeleton className='aspect-video rounded-md' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              
              {/* Reactions */}
              <div className='mt-2 flex justify-between border-t pt-2'>
                <Skeleton className='h-3 w-32' />
                <Skeleton className='h-3 w-24' />
              </div>
              
              {/* Actions */}
              <div className='mt-2 flex justify-between border-t pt-2'>
                <Skeleton className='h-8 w-28 rounded-md' />
                <Skeleton className='h-8 w-28 rounded-md' />
                <Skeleton className='h-8 w-28 rounded-md' />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}