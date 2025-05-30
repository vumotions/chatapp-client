import { Separator } from '~/components/ui/separator'
import FormAccount from './form-account'

export default function SettingsAccountPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>Account</h3>
        <p className='text-muted-foreground text-sm'>Update your account settings and appearance preferences.</p>
      </div>
      <Separator />
      <FormAccount />
    </div>
  )
}
