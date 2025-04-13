'use client'

import { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'

type Props = {
  children: ReactNode
  title?: string
  desc?: string
  actions: ReactNode
}

export function Modal({ children, actions, desc, title }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
