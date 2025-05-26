import ProfileForm from './form-profile'
import { Separator } from '~/components/ui/separator'

export default function SettingsProfilePage() {
  return (
    <div>
      <div className='space-y-6'>
        <div>
          <h3 className='text-lg font-medium'>Thông tin cá nhân</h3>
          <p className='text-muted-foreground text-sm'>Cập nhật thông tin cá nhân của bạn.</p>
        </div>
        <Separator />
        <ProfileForm />
      </div>
    </div>
  )
}
