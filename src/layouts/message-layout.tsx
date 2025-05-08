'use client'

import { Archive, ArchiveX, File, Home, Inbox, Search, Send, Settings, Trash2, Users2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useEffect, useState } from 'react'
import { ChatList } from '~/app/[locale]/(main)/messages/components/chat-list'
import { Nav } from '~/components/nav'
import { Input } from '~/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { TooltipProvider } from '~/components/ui/tooltip'
import useMediaQuery from '~/hooks/use-media-query'
import { usePathname } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { LayoutProps } from '~/types/props.types'

function MessageLayout({ children }: LayoutProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [minLayout, setMinLayout] = useState<number[]>([20, 32, 48])
  const isSmallScreen = useMediaQuery('(max-width: 1024px)')

  useEffect(() => {
    if (isSmallScreen) {
      onCollapseCallback(true)
      setMinLayout([4, 46, 50])
    }
  }, [isSmallScreen])

  const onCollapseCallback = (isCollapsed: boolean) => {
    setIsCollapsed(isCollapsed)
    document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(isCollapsed)}`
  }

  const handleChangeTab = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', value)
    router.push(`${pathname}?${params.toString()}`)
  }

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
          defaultSize={minLayout[0]}
          collapsedSize={4}
          collapsible={true}
          minSize={15}
          maxSize={isSmallScreen ? 4 : 20}
          onCollapse={() => onCollapseCallback(true)}
          onResize={() => onCollapseCallback(false)}
          className={cn('pt-4', {
            'min-w-[50px] transition-all duration-300 ease-in-out': isCollapsed,
            'border-r': isSmallScreen
          })}
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
                  title: 'Home',
                  label: '',
                  icon: Home,
                  variant: 'ghost',
                  href: '/'
                },
                {
                  title: 'Settings',
                  label: '',
                  icon: Settings,
                  variant: 'ghost',
                  href: '/settings'
                }
              ]}
            />
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle={!isSmallScreen} />
        <ResizablePanel defaultSize={minLayout[1]} minSize={40}>
          <Tabs defaultValue='all' onValueChange={handleChangeTab}>
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
              <ChatList />
            </TabsContent>
            <TabsContent value='unread' className='m-0'>
              <ChatList />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={minLayout[2]} minSize={35}>
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}

export default MessageLayout
