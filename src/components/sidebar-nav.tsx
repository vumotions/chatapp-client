'use client'

import { Link, usePathname } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { buttonVariants } from './ui/button'

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
  }[]
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname()
  return (
    <nav className={cn('flex space-x-2 lg:flex-col lg:space-y-1 lg:space-x-0', className)} {...props}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(buttonVariants({ variant: 'ghost' }), 'justify-start hover:bg-transparent hover:underline', {
            'bg-muted hover:bg-muted': pathname === item.href
          })}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
