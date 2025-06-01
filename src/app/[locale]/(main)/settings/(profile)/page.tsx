import ProfileForm from './form-profile'
import { Separator } from '~/components/ui/separator'
import { useSettingsTranslation } from '~/hooks/use-translations'

export default function SettingsProfilePage() {
  const t = useSettingsTranslation()
  
  return (
    <div>
      <div className='space-y-6'>
        <div>
          <h3 className='text-lg font-medium'>{t('profile.title')}</h3>
          <p className='text-muted-foreground text-sm'>{t('profile.description')}</p>
        </div>
        <Separator />
        <ProfileForm />
      </div>
    </div>
  )
}
