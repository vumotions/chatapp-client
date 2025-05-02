'use client'

import { Button } from '~/components/ui/button'
import httpRequest from '~/config/http-request'

export default function Home() {
  const handleClick = async () => {
    try {
      await httpRequest.get('/test')
    } catch (error) {
      console.log({ error })
    }
  }
  return (
    <div>
      <Button onClick={handleClick}>Click</Button>
    </div>
  )
}
