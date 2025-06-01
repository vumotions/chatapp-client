import { useAuthTranslation } from '~/hooks/use-translations'
import { Link } from '~/i18n/navigation'
import FormCode from './form-code'

function RecoveryCode() {
  const t = useAuthTranslation()
  
  return (
    <div className='px-4 py-6 lg:p-8'>
      <div className='mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6'>
        <FormCode />
        <p className='text-muted-foreground px-8 text-center text-sm'>
          {t('byClickingContinue')}{' '}
          <Link href='/terms' className='hover:text-primary underline underline-offset-4'>
            {t('termsOfService')}
          </Link>{' '}
          {t('and')}{' '}
          <Link href='/privacy' className='hover:text-primary underline underline-offset-4'>
            {t('privacyPolicy')}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default RecoveryCode
