import { Link } from '~/i18n/navigation'
import FormLogin from './form-login'

function Login() {
  return (
    <div className='px-4 py-6 lg:p-8'>
      <div className='mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>Welcome back!</h1>
          <p className='text-muted-foreground text-sm'>We're happy to see you again. Log in to continue</p>
        </div>
        <FormLogin />
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

export default Login
