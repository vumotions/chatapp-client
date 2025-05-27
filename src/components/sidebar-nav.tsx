'use client'

import { Link, usePathname } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { buttonVariants } from './ui/button'
import { Badge } from './ui/badge'

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
    disabled?: boolean
    badge?: string
    description?: string
  }[]
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname()
  return (
    <nav className={cn('flex space-x-2 lg:flex-col lg:space-y-1 lg:space-x-0', className)} {...props}>
      {items.map((item) => {
        const isActive = pathname === item.href

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium',
                'cursor-not-allowed border border-transparent opacity-70',
                'text-muted-foreground'
              )}
            >
              <span>{item.title}</span>
              {item.badge && (
                <Badge
                  variant='outline'
                  className='ml-2 border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500'
                >
                  {item.badge}
                </Badge>
              )}
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'justify-start border',
              isActive
                ? 'bg-accent text-accent-foreground border-accent'
                : 'hover:bg-accent/50 hover:text-accent-foreground border-transparent'
            )}
          >
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
