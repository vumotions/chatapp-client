'use client'

import { Archive, ArchiveX, File, Inbox, Search, Send, Settings, Trash2, Users2 } from 'lucide-react'

import { useState } from 'react'
import { Input } from '~/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { TooltipProvider } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useMail } from '../../../../hooks/use-chat'
import type { Mail } from '../data'
import { ChatDisplay } from './chat-display'
import { ChatList } from './chat-list'

import { Nav } from '~/components/nav'
import { ScrollArea } from '~/components/ui/scroll-area'

type MailProps = {
  accounts: {
    label: string
    email: string
    icon: React.ReactNode
  }[]
  mails: Mail[]
  defaultLayout: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

function Chat({
  accounts,
  mails,
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [mail] = useMail()
  // const isSmallScreen = useMediaQuery('(max-width: 1024px)')

  const onCollapseCallback = (isCollapsed: boolean) => {
    setIsCollapsed(isCollapsed)
    document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(isCollapsed)}`
  }

  // useEffect(() => {
  //   if (isSmallScreen) {
  //     onCollapseCallback(true)
  //   }
  // }, [isSmallScreen])

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction='horizontal'
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout:messages=${JSON.stringify(sizes)}`
        }}
        className='h-full max-h-screen items-stretch'
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onCollapse={() => onCollapseCallback(true)}
          onResize={() => onCollapseCallback(false)}
          className={cn('pt-4', isCollapsed && 'min-w-[50px] transition-all duration-300 ease-in-out')}
        >
          <ScrollArea className='h-screen'>
            <Nav
              isCollapsed={isCollapsed}
              links={[
                {
                  title: 'Inbox',
                  label: '128',
                  icon: Inbox,
                  variant: 'default'
                },
                {
                  title: 'Drafts',
                  label: '9',
                  icon: File,
                  variant: 'ghost'
                },
                {
                  title: 'Sent',
                  label: '',
                  icon: Send,
                  variant: 'ghost'
                },
                {
                  title: 'Junk',
                  label: '23',
                  icon: ArchiveX,
                  variant: 'ghost'
                },
                {
                  title: 'Trash',
                  label: '',
                  icon: Trash2,
                  variant: 'ghost'
                },
                {
                  title: 'Archive',
                  label: '',
                  icon: Archive,
                  variant: 'ghost'
                }
              ]}
            />
            <Separator />
            <Nav
              isCollapsed={isCollapsed}
              links={[
                {
                  title: 'Social',
                  label: '972',
                  icon: Users2,
                  variant: 'ghost'
                },
                {
                  title: 'Settings',
                  label: '21',
                  icon: Settings,
                  variant: 'ghost',
                  href: '/settings'
                }
              ]}
            />
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <Tabs defaultValue='all'>
            <div className='flex items-center px-4 py-2'>
              <h1 className='text-xl font-bold'>Inbox</h1>
              <TabsList className='ml-auto'>
                <TabsTrigger
                  value='all'
                  className='dark:data-[state=active]:bg-background text-zinc-600 dark:text-zinc-200'
                >
                  All messages
                </TabsTrigger>
                <TabsTrigger
                  value='unread'
                  className='dark:data-[state=active]:bg-background text-zinc-600 dark:text-zinc-200'
                >
                  Unread
                </TabsTrigger>
              </TabsList>
            </div>
            <Separator />
            <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 p-4 backdrop-blur'>
              <form>
                <div className='relative'>
                  <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
                  <Input placeholder='Search' className='pl-8' />
                </div>
              </form>
            </div>
            <TabsContent value='all' className='m-0'>
              <ChatList items={mails} />
            </TabsContent>
            <TabsContent value='unread' className='m-0'>
              <ChatList items={mails.filter((item) => !item.read)} />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={30}>
          <ChatDisplay mail={mails.find((item) => item.id === mail.selected) || null} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}

export default Chat
