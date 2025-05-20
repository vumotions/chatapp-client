'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Archive, Edit, Home, Inbox, Settings, UserX } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import ChatList from '~/app/[locale]/(main)/messages/components/chat-list'
import { Nav } from '~/components/nav'
import { NetworkStatusIndicator } from '~/components/network-status'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { TooltipProvider } from '~/components/ui/tooltip'
import useMediaQuery from '~/hooks/use-media-query'
import { usePathname } from '~/i18n/navigation'
import { cn } from '~/lib/utils'
import { LayoutProps } from '~/types/props.types'
import BlockedUsersList from '~/components/ui/chat/blocked-users-list'

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
  const viewParam = searchParams.get('view') || 'inbox'
  const validViews = ['inbox', 'blocked-users', 'archived']
  const currentView = validViews.includes(viewParam) ? viewParam : 'inbox'

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

  // Lấy tiêu đề dựa trên view hiện tại
  const getViewTitle = () => {
    switch (currentView) {
      case 'inbox':
        return 'Inbox'
      case 'archived':
        return 'Archive'
      case 'blocked-users':
        return 'Blocked Users'
      case 'drafts':
        return 'Drafts'
      default:
        return 'Inbox'
    }
  }

  // Trong phần xử lý cho mobile
  // Thay đổi phần này:
  if (isMobile && isViewingChat) {
    return (
      <AnimatePresence mode='wait'>
        <motion.div
          key='chat-detail'
          className='flex h-full flex-col'
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    )
  }

  // Nếu là mobile và đang xem danh sách, chỉ hiển thị phần danh sách
  if (isMobile) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className='flex h-full flex-col'>
          <div className='flex h-full'>
            {/* Nav bên trái - luôn hiển thị */}
            <div className='border-r w-[60px] pt-4'>
              <ScrollArea className='h-screen'>
                <div className='mt-4 flex flex-col items-center justify-center'>
                  <NetworkStatusIndicator />
                </div>
                <Nav
                  isCollapsed={true}
                  links={[
                    {
                      title: 'Inbox',
                      label: '',
                      icon: Inbox,
                      variant: currentView === 'inbox' ? 'default' : 'ghost',
                      onClick: () => handleNavClick('inbox')
                    },
                    {
                      title: 'Blocked Users',
                      label: '',
                      icon: UserX,
                      variant: currentView === 'blocked-users' ? 'default' : 'ghost',
                      onClick: () => handleNavClick('blocked-users')
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
                  isCollapsed={true}
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
            </div>

            {/* Phần nội dung chính */}
            <div className='flex-1 relative'>
              {isViewingChat ? (
                <AnimatePresence mode='wait'>
                  <motion.div
                    key='chat-detail'
                    className='flex h-full flex-col absolute inset-0 z-10 bg-background'
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <AnimatePresence mode='wait'>
                  <motion.div
                    className='flex h-full flex-col'
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    {currentView === 'blocked-users' ? (
                      // Hiển thị danh sách người dùng bị chặn
                      <div className='flex h-full flex-col'>
                        <div className='flex items-center px-4 py-3'>
                          <h1 className='text-xl font-bold'>{getViewTitle()}</h1>
                        </div>
                        <Separator />
                        <BlockedUsersList />
                      </div>
                    ) : (
                      // Hiển thị danh sách chat như bình thường
                      <Tabs defaultValue={currentFilter} onValueChange={handleChangeTab}>
                        <div className='flex items-center px-4 py-2'>
                          <h1 className='text-xl font-bold'>{getViewTitle()}</h1>
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
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
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
            <div className='mt-4 flex flex-col items-center justify-center'>
              <NetworkStatusIndicator />
            </div>
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
                  title: 'Blocked Users',
                  label: '',
                  icon: UserX,
                  variant: currentView === 'blocked-users' ? 'default' : 'ghost',
                  onClick: () => handleNavClick('blocked-users')
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
          {currentView === 'blocked-users' ? (
            // Hiển thị danh sách người dùng bị chặn
            <div className='flex h-full flex-col'>
              <div className='flex items-center px-4 py-3'>
                <h1 className='text-xl font-bold'>{getViewTitle()}</h1>
              </div>
              <Separator />
              <BlockedUsersList />
            </div>
          ) : (
            // Hiển thị danh sách chat như bình thường
            <Tabs defaultValue={currentFilter} onValueChange={handleChangeTab}>
              <div className='flex items-center px-4 py-2'>
                <h1 className='text-xl font-bold'>{getViewTitle()}</h1>
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
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={minLayout[2]} minSize={35}>
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
