import { Separator } from '~/components/ui/separator'
import FormNotifications from './form-notifications'
import { useSettingsTranslation } from '~/hooks/use-translations'

function Notifications() {
  const t = useSettingsTranslation()
  
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>{t('notifications.title')}</h3>
        <p className='text-muted-foreground text-sm'>{t('notifications.description')}</p>
      </div>
      <Separator />
      <FormNotifications />
    </div>
  )
}

export default Notifications
