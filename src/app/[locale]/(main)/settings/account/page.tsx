import { Separator } from '~/components/ui/separator'
import FormAccount from './form-account'
import { useSettingsTranslation } from '~/hooks/use-translations'

export default function SettingsAccountPage() {
  const t = useSettingsTranslation()
  
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>{t('account.title')}</h3>
        <p className='text-muted-foreground text-sm'>{t('account.description')}</p>
      </div>
      <Separator />
      <FormAccount />
    </div>
  )
}
