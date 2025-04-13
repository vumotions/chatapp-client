import { cookies } from 'next/headers'
import Image from 'next/image'

// Data from API
import { accounts, mails } from './data'
import Chat from './components/chat'
import { Input } from '~/components/ui/input'

async function Messages() {
  const layout = (await cookies()).get('react-resizable-panels:layout:messages')
  const collapsed = (await cookies()).get('react-resizable-panels:collapsed')

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined

  return (
    <Chat
      accounts={accounts}
      mails={mails}
      defaultLayout={defaultLayout}
      defaultCollapsed={defaultCollapsed}
      navCollapsedSize={4}
    />
  )
}

export default Messages
