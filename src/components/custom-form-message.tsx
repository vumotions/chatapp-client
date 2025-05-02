import { cn } from '~/lib/utils'

type Props = {
  message?: string
  className?: string
}
function CustomFormMessage({ message, className }: Props) {
  return <p className={cn('text-destructive min-h-5 text-sm', className)}>{message}</p>
}

export default CustomFormMessage
