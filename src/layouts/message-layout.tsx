'use client'

import { Archive, ArrowLeft, File, Home, Inbox, Settings } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import ChatList from '~/app/[locale]/(main)/messages/components/chat-list'
import { Nav } from '~/components/nav'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { TooltipProvider } from '~/components/ui/tooltip'
import { Button } from '~/components/ui/button'
import useMediaQuery from '~/hooks/use-media-query'
import { usePathname } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { LayoutProps } from '~/types/props.types'

export default function MessageLayout({ children }: LayoutProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [minLayout, setMinLayout] = useState<number[]>([20, 32, 48])
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isSmallScreen = useMediaQuery('(max-width: 1024px)')

  // Lấy filter từ URL hoặc mặc định là 'all'
  const currentFilter = searchParams.get('filter') || 'all'
  // Lấy view từ URL hoặc mặc định là 'inbox'
  const currentView = searchParams.get('view') || 'inbox'
  
  // Kiểm tra xem có đang xem chi tiết cuộc trò chuyện không
  const chatId = pathname.split('/').pop()
  const isViewingChat = pathname.includes('/messages/') && chatId !== 'messages'
  
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

    // Giữ nguyên chatId trong URL nếu có
    const chatId = pathname.split('/').pop()
    if (chatId && pathname.includes('/messages/')) {
      router.push(`/messages/${chatId}?${params.toString()}`)
    } else {
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  // Xử lý khi click vào các mục trong sidebar
  const handleNavClick = (view: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', view)

    // Giữ nguyên chatId trong URL nếu có
    const chatId = pathname.split('/').pop()
    if (chatId && pathname.includes('/messages/')) {
      router.push(`/messages/${chatId}?${params.toString()}`)
    } else {
      router.push(`${pathname}?${params.toString()}`)
    }
  }
  
  // Xử lý quay lại danh sách chat trên mobile
  const handleBackToList = () => {
    router.push('/messages')
  }

  // Nếu là mobile và đang xem chi tiết chat, chỉ hiển thị phần chi tiết
  if (isMobile && isViewingChat) {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key="chat-detail"
          className="flex h-full flex-col"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Loại bỏ header riêng biệt ở đây */}
          {children}
        </motion.div>
      </AnimatePresence>
    )
  }

  // Nếu là mobile và đang xem danh sách, chỉ hiển thị phần danh sách
  if (isMobile) {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          className="flex h-full flex-col"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Tabs defaultValue={currentFilter} onValueChange={handleChangeTab}>
            <div className="flex items-center px-4 py-2">
              <h1 className="text-xl font-bold">{currentView === 'inbox' ? 'Inbox' : 'Archive'}</h1>
              <TabsList className="ml-auto">
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
            <TabsContent value='all' className='m-0'>
              <ChatList />
            </TabsContent>
            <TabsContent value='unread' className='m-0'>
              <ChatList />
            </TabsContent>
          </Tabs>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Desktop layout với ResizablePanelGroup
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
          onExpand={() => onCollapseCallback(false)}
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
                  label: '',
                  icon: Inbox,
                  variant: currentView === 'inbox' ? 'default' : 'ghost',
                  onClick: () => handleNavClick('inbox')
                },
                {
                  title: 'Drafts',
                  label: '',
                  icon: File,
                  variant: 'ghost'
                },
                {
                  title: 'Archive',
                  label: '',
                  icon: Archive,
                  variant: currentView === 'archived' ? 'default' : 'ghost',
                  onClick: () => handleNavClick('archived')
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
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={minLayout[1]} minSize={40}>
          <Tabs defaultValue={currentFilter} onValueChange={handleChangeTab}>
            <div className='flex items-center px-4 py-2'>
              <h1 className='text-xl font-bold'>{currentView === 'inbox' ? 'Inbox' : 'Archive'}</h1>
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
