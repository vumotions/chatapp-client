import { Separator } from '~/components/ui/separator'
import FormAccount from './form-account'

function Account() {
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>Account</h3>
        <p className='text-muted-foreground text-sm'>
          Update your account settings. Set your preferred language and timezone.
        </p>
      </div>
      <Separator />
      <FormAccount />
    </div>
  )
}

export default Account
