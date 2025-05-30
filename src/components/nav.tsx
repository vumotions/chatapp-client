'use client'

import { LucideIcon } from 'lucide-react'

import { buttonVariants } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Link } from '~/i18n/navigation'
import { cn } from '~/lib/utils'

type Props = {
  isCollapsed: boolean
  links: {
    title: string
    label?: string
    icon: LucideIcon
    href?: string
    variant: 'default' | 'ghost'
    onClick?: () => void
  }[]
}

export function Nav({ links, isCollapsed }: Props) {
  return (
    <div data-collapsed={isCollapsed} className='group mt-4 flex flex-col gap-4 py-2 data-[collapsed=true]:py-2'>
      <nav className='grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2'>
        {links.map((link, index) =>
          isCollapsed ? (
            <Tooltip key={index} delayDuration={0}>
              <TooltipTrigger asChild>
                {link.href ? (
                  <Link
                    href={link.href}
                    className={cn(
                      buttonVariants({ variant: link.variant, size: 'icon' }),
                      'h-9 w-9',
                      link.variant === 'default' &&
                        'dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white'
                    )}
                  >
                    <link.icon className='h-4 w-4' />
                    <span className='sr-only'>{link.title}</span>
                  </Link>
                ) : (
                  <button
                    onClick={link.onClick}
                    className={cn(
                      buttonVariants({ variant: link.variant, size: 'icon' }),
                      'h-9 w-9',
                      link.variant === 'default' &&
                        'dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white'
                    )}
                  >
                    <link.icon className='h-4 w-4' />
                    <span className='sr-only'>{link.title}</span>
                  </button>
                )}
              </TooltipTrigger>
              <TooltipContent side='right' className='flex items-center gap-4'>
                {link.title}
                {link.label && <span className='text-muted-foreground ml-auto'>{link.label}</span>}
              </TooltipContent>
            </Tooltip>
          ) : link.href ? (
            <Link
              key={index}
              href={link.href}
              className={cn(
                buttonVariants({ variant: link.variant, size: 'sm' }),
                link.variant === 'default' && 'dark:bg-muted dark:hover:bg-muted dark:text-white dark:hover:text-white',
                'justify-start'
              )}
            >
              <link.icon className='mr-2 h-4 w-4' />
              {link.title}
              {link.label && (
                <span className={cn('ml-auto', link.variant === 'default' && 'text-background dark:text-white')}>
                  {link.label}
                </span>
              )}
            </Link>
          ) : (
            <button
              key={index}
              onClick={link.onClick}
              className={cn(
                buttonVariants({ variant: link.variant, size: 'sm' }),
                link.variant === 'default' && 'dark:bg-muted dark:hover:bg-muted dark:text-white dark:hover:text-white',
                'w-full justify-start'
              )}
            >
              <link.icon className='mr-2 h-4 w-4' />
              {link.title}
              {link.label && (
                <span className={cn('ml-auto', link.variant === 'default' && 'text-background dark:text-white')}>
                  {link.label}
                </span>
              )}
            </button>
          )
        )}
      </nav>
    </div>
  )
}
