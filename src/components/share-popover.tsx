'use client'

import { ReactNode } from 'react'
import {
  FacebookIcon,
  FacebookShareButton,
  TelegramIcon,
  TelegramShareButton,
  TwitterIcon,
  TwitterShareButton
} from 'react-share'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import Protected from './protected'

type Props = {
  shareUrl: string
  title?: string
  children: ReactNode
}
function SharePopover({ shareUrl, children, title }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className='flex w-fit gap-2' side='top' align='center'>
        <Protected>
          <FacebookShareButton url={shareUrl} title={title}>
            <FacebookIcon size={32} round />
          </FacebookShareButton>
        </Protected>

        <Protected>
          <TelegramShareButton url={shareUrl} title={title}>
            <TelegramIcon size={32} round />
          </TelegramShareButton>
        </Protected>

        <Protected>
          <TwitterShareButton url={shareUrl} title={title}>
            <TwitterIcon size={32} round />
          </TwitterShareButton>
        </Protected>
      </PopoverContent>
    </Popover>
  )
}

export default SharePopover
