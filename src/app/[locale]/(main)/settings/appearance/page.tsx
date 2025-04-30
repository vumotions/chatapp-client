'use client'

import dynamic from 'next/dynamic'
import { Separator } from '~/components/ui/separator'
import FormAppearanceSkeleton from './form-appearance-skeleton'
const FormAppearance = dynamic(() => import('./form-appearance'), {
  ssr: false,
  loading: () => <FormAppearanceSkeleton />
})

function Appearance() {
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>Appearance</h3>
        <p className='text-muted-foreground text-sm'>
          Customize the appearance of the app. Automatically switch between day and night themes.
        </p>
      </div>
      <Separator />
      <FormAppearance />
    </div>
  )
}

export default Appearance
