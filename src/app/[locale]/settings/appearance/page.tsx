import { Separator } from '~/components/ui/separator'
import FormAppearance from './form-appearance'

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
