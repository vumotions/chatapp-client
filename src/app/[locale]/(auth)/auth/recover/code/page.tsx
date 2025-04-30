import { Link } from '~/i18n/navigation'
import FormCode from './form-code'

function RecoveryCode() {
  return (
    <div className='px-4 py-6 lg:p-8'>
      <div className='mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>Enter the code from your email</h1>
          <p className='space-x-1 text-sm'>
            <span className='text-muted-foreground'>
              Let us know that this email address belongs to you. Enter the code from the email sent to
            </span>
            <strong className='underline'>lequangvu05053@gmail.com</strong>.
          </p>
        </div>
        <FormCode />
        <p className='text-muted-foreground px-8 text-center text-sm'>
          By clicking continue, you agree to our{' '}
          <Link href='/terms' className='hover:text-primary underline underline-offset-4'>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href='/privacy' className='hover:text-primary underline underline-offset-4'>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default RecoveryCode
