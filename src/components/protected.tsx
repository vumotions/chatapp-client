import { useSession } from 'next-auth/react'
import { useState, ReactNode, cloneElement, isValidElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

interface ProtectedProps {
  children: ReactNode
  requireVerified?: boolean
  message?: string
}

export default function Protected({ children, requireVerified = false, message }: ProtectedProps) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Kiểm tra điều kiện
  const isAllowed = session && (!requireVerified || session.user?.verify === 'VERIFIED')

  // Hàm xử lý khi click vào children
  const handleProtectedClick = (e: React.MouseEvent) => {
    if (!isAllowed) {
      e.preventDefault()
      setOpen(true)
    }
    // Nếu được phép, để children tự xử lý onClick
  }

  // Nếu children là 1 element (ví dụ Button), clone và override onClick
  const protectedChild = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
        onClick: (e: React.MouseEvent) => {
          handleProtectedClick(e)
          if (isAllowed && isValidElement(children)) {
            const childProps = children.props as { onClick?: (e: React.MouseEvent) => void }
            if (childProps.onClick) {
              childProps.onClick(e)
            }
          }
        }
      })
    : children

  return (
    <>
      {protectedChild}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {message ||
                (!session
                  ? 'Bạn cần đăng nhập để sử dụng tính năng này.'
                  : 'Bạn cần xác thực tài khoản để sử dụng tính năng này.')}
            </DialogTitle>
            <DialogDescription>Vui lòng đăng nhập để tiếp tục sử dụng các tính năng nâng cao.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setOpen(false)
                router.push('/auth/login')
              }}
            >
              Login to continue
            </Button>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
