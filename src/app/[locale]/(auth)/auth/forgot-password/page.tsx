import { Link } from '~/i18n/navigation'
import FormForgotPassword from './form-forgot-password'

function ForgotPassword() {
  return (
    <div className='px-4 py-6 lg:p-8'>
      <div className='mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>Forgot your password?</h1>
          <p className='text-muted-foreground text-sm'>
            Enter your email address and we'll send you a code to reset your password.
          </p>
        </div>
        <FormForgotPassword />
        <p className='text-muted-foreground px-8 text-center text-sm'>
          Remember your password?{' '}
          <Link href='/auth/login' className='hover:text-primary underline underline-offset-4'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
