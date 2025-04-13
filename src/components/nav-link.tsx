'use client'

import { ComponentProps } from 'react'
import { Link, usePathname } from '~/i18n/navigation'
import { cn } from '~/lib/utils'

function NavLink({ href, classNameActive, ...rest }: ComponentProps<typeof Link> & { classNameActive?: string }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={cn({
        [`${classNameActive}`]: isActive
      })}
      href={href}
      {...rest}
    />
  )
}

export default NavLink
