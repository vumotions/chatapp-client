'use client'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { CHAT_TYPE } from '~/constants/enums'

import { useQuery } from '@tanstack/react-query'
import { debounce } from 'lodash'
import { FileText, Loader2, MessageCircle, Search, User, Users, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import useMediaQuery from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import searchService from '~/services/search.service'

type SearchTab = 'all' | 'users' | 'posts' | 'chats'

function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { data: session } = useSession()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // State cho tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')

  // Tạo hàm debounced để cập nhật debouncedQuery
  const debouncedSetQuery = useRef(
    debounce((value: string) => {
      setDebouncedQuery(value)
    }, 500)
  ).current

  // Cập nhật searchQuery và gọi hàm debounced
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedSetQuery(value)
  }

  // Cleanup debounce khi unmount
  useEffect(() => {
    return () => {
      debouncedSetQuery.cancel()
    }
  }, [debouncedSetQuery])

  // Xử lý click bên ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Tìm kiếm tất cả
  const { data: searchResults = { users: [], posts: [], conversations: [] }, isLoading: isSearching } = useQuery({
    queryKey: ['search', 'all', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { users: [], posts: [], conversations: [] }
      const response = await searchService.searchAll(debouncedQuery)
      return response?.data?.data || { users: [], posts: [], conversations: [] }
    },
    enabled: !!debouncedQuery.trim(),
    staleTime: 30000
  })

  // Xử lý khi chọn một item
  const handleNavigate = (path: string) => {
    if (!isPending) {
      startTransition(() => {
        setIsOpen(false)
        router.push(path)
        setSearchQuery('')
        setDebouncedQuery('')
      })
    }
  }

  // Lấy tên hiển thị cho cuộc trò chuyện
  const getChatDisplayName = (chat: any) => {
    if (chat.name) return chat.name

    // Nếu là chat nhóm nhưng không có tên, hiển thị tên các thành viên
    if (chat.type === CHAT_TYPE.GROUP) {
      return (
        chat.participants
          .map((p: any) => p.name)
          .slice(0, 3)
          .join(', ') + (chat.participants.length > 3 ? '...' : '')
      )
    }

    // Nếu là chat 1-1, hiển thị tên người kia
    return chat.participants[0]?.name || 'Chat'
  }

  // Hiển thị icon tròn trên mobile, form search trên desktop
  if (isMobile && session) {
    return (
      <>
        <Button
          variant='ghost'
          size='icon'
          className='bg-accent/50 rounded-full'
          onClick={() => !isPending && setIsOpen(true)}
          disabled={isPending}
        >
          <Search className='h-5 w-5' />
          <span className='sr-only'>Search</span>
        </Button>

        {isOpen && (
          <div className='bg-background/80 fixed inset-0 z-50 backdrop-blur-sm'>
            <div className='bg-background fixed inset-x-0 top-0 z-50 border-b p-4 shadow-sm'>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    setIsOpen(false)
                    setSearchQuery('')
                    setDebouncedQuery('')
                  }}
                >
                  <X className='h-5 w-5' />
                </Button>
                <div className='relative flex-1'>
                  <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder='Search...'
                    className='bg-accent/30 w-full border-0 pl-9'
                    autoFocus
                  />
                  {searchQuery && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2'
                      onClick={() => {
                        setSearchQuery('')
                        setDebouncedQuery('')
                        inputRef.current?.focus()
                      }}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className='fixed inset-x-0 top-[73px] bottom-0 z-50 overflow-y-auto'>
              {!debouncedQuery.trim() ? (
                <div className='text-muted-foreground flex h-32 flex-col items-center justify-center'>
                  <Search className='mb-2 h-8 w-8 opacity-20' />
                  <p className='text-sm'>Type to search...</p>
                </div>
              ) : isSearching ? (
                <div className='flex h-32 flex-col items-center justify-center'>
                  <Loader2 className='text-primary mb-2 h-8 w-8 animate-spin' />
                  <p className='text-sm'>Searching...</p>
                </div>
              ) : (
                <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as SearchTab)}>
                  <div className='bg-background sticky top-0 border-b shadow-sm'>
                    <TabsList className='h-12 w-full justify-start bg-transparent px-2 pb-2'>
                      <TabsTrigger
                        value='all'
                        className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full'
                      >
                        All
                      </TabsTrigger>
                      <TabsTrigger
                        value='users'
                        className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full'
                      >
                        Users
                      </TabsTrigger>
                      <TabsTrigger
                        value='posts'
                        className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full'
                      >
                        Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value='chats'
                        className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full'
                      >
                        Chats
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value='all' className='mt-0 p-0 focus-visible:outline-none'>
                    {searchResults.users.length === 0 &&
                    searchResults.posts.length === 0 &&
                    searchResults.conversations.length === 0 ? (
                      <div className='text-muted-foreground flex h-32 flex-col items-center justify-center'>
                        <Search className='mb-2 h-8 w-8 opacity-20' />
                        <p className='text-sm'>No results found</p>
                      </div>
                    ) : (
                      <div>
                        {/* Users */}
                        {searchResults.users.length > 0 && (
                          <div className='py-2'>
                            <div className='flex items-center justify-between px-4 pb-1'>
                              <h3 className='text-muted-foreground text-xs font-medium'>Users</h3>
                              {searchResults.users.length > 3 && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-primary h-6 px-2 text-xs'
                                  onClick={() => {
                                    setActiveTab('users')
                                  }}
                                >
                                  See all
                                </Button>
                              )}
                            </div>
                            <div>
                              {searchResults.users.slice(0, 3).map((user) => (
                                <div
                                  key={user._id}
                                  className='hover:bg-accent flex cursor-pointer items-center px-4 py-2 transition-colors'
                                  onClick={() => handleNavigate(`/profile/${user.username || user._id}`)}
                                >
                                  <Avatar className='mr-3 h-8 w-8 border'>
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className='text-sm font-medium'>{user.name}</p>
                                    {user.username && <p className='text-muted-foreground text-xs'>@{user.username}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Posts */}
                        {searchResults.posts.length > 0 && (
                          <div className='border-t py-2'>
                            <div className='flex items-center justify-between px-4 pb-1'>
                              <h3 className='text-muted-foreground text-xs font-medium'>Posts</h3>
                              {searchResults.posts.length > 3 && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-primary h-6 px-2 text-xs'
                                  onClick={() => {
                                    setActiveTab('posts')
                                  }}
                                >
                                  See all
                                </Button>
                              )}
                            </div>
                            <div>
                              {searchResults.posts.slice(0, 3).map((post) => (
                                <div
                                  key={post._id}
                                  className='hover:bg-accent flex cursor-pointer items-start px-4 py-2 transition-colors'
                                  onClick={() => handleNavigate(`/posts/${post._id}`)}
                                >
                                  {post.media && post.media.length > 0 ? (
                                    <div className='mr-3 h-8 w-8 flex-shrink-0 overflow-hidden rounded-md border'>
                                      <img src={post.media[0].url} alt='' className='h-full w-full object-cover' />
                                    </div>
                                  ) : (
                                    <div className='bg-muted mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border'>
                                      <FileText className='text-muted-foreground h-4 w-4' />
                                    </div>
                                  )}
                                  <div className='min-w-0 flex-1'>
                                    <p className='line-clamp-2 text-xs'>{post.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Chats */}
                        {searchResults.conversations.length > 0 && (
                          <div className='border-t py-2'>
                            <div className='flex items-center justify-between px-4 pb-1'>
                              <h3 className='text-muted-foreground text-xs font-medium'>Chats</h3>
                              {searchResults.conversations.length > 3 && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-primary h-6 px-2 text-xs'
                                  onClick={() => {
                                    setActiveTab('chats')
                                  }}
                                >
                                  See all
                                </Button>
                              )}
                            </div>
                            <div>
                              {searchResults.conversations.slice(0, 3).map((chat) => (
                                <div
                                  key={chat._id}
                                  className='hover:bg-accent flex cursor-pointer items-center px-4 py-2 transition-colors'
                                  onClick={() => handleNavigate(`/messages/${chat._id}`)}
                                >
                                  {chat.type === CHAT_TYPE.GROUP ? (
                                    <div className='bg-muted mr-3 flex h-8 w-8 items-center justify-center rounded-full border'>
                                      <Users className='text-muted-foreground h-4 w-4' />
                                    </div>
                                  ) : (
                                    <Avatar className='mr-3 h-8 w-8 border'>
                                      <AvatarImage
                                        src={chat.participants?.[0]?.avatar}
                                        alt={chat.participants?.[0]?.name}
                                      />
                                      <AvatarFallback>{chat.participants?.[0]?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div>
                                    <p className='text-sm font-medium'>{getChatDisplayName(chat)}</p>
                                    <p className='text-muted-foreground text-xs'>
                                      {chat.type === CHAT_TYPE.GROUP ? 'Group' : 'Direct message'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='users' className='mt-0 p-0 focus-visible:outline-none'>
                    {searchResults.users.length === 0 ? (
                      <div className='text-muted-foreground flex flex-col items-center justify-center py-8'>
                        <User className='mb-2 h-8 w-8 opacity-20' />
                        <p className='text-sm'>No users found</p>
                      </div>
                    ) : (
                      <div>
                        {searchResults.users.map((user) => (
                          <div
                            key={user._id}
                            className='hover:bg-accent flex cursor-pointer items-center border-b px-4 py-2 transition-colors last:border-0'
                            onClick={() => handleNavigate(`/profile/${user.username || user._id}`)}
                          >
                            <Avatar className='mr-3 h-8 w-8 border'>
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className='text-sm font-medium'>{user.name}</p>
                              {user.username && <p className='text-muted-foreground text-xs'>@{user.username}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='posts' className='mt-0 p-0 focus-visible:outline-none'>
                    {searchResults.posts.length === 0 ? (
                      <div className='text-muted-foreground flex flex-col items-center justify-center py-8'>
                        <FileText className='mb-2 h-8 w-8 opacity-20' />
                        <p className='text-sm'>No posts found</p>
                      </div>
                    ) : (
                      <div>
                        {searchResults.posts.map((post) => (
                          <div
                            key={post._id}
                            className='hover:bg-accent flex cursor-pointer items-start border-b px-4 py-2 transition-colors last:border-0'
                            onClick={() => handleNavigate(`/posts/${post._id}`)}
                          >
                            {post.media && post.media.length > 0 ? (
                              <div className='mr-3 h-8 w-8 flex-shrink-0 overflow-hidden rounded-md border'>
                                <img src={post.media[0].url} alt='' className='h-full w-full object-cover' />
                              </div>
                            ) : (
                              <div className='bg-muted mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border'>
                                <FileText className='text-muted-foreground h-4 w-4' />
                              </div>
                            )}
                            <div className='min-w-0 flex-1'>
                              <p className='line-clamp-2 text-xs'>{post.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='chats' className='mt-0 p-0 focus-visible:outline-none'>
                    {searchResults.conversations.length === 0 ? (
                      <div className='text-muted-foreground flex flex-col items-center justify-center py-8'>
                        <MessageCircle className='mb-2 h-8 w-8 opacity-20' />
                        <p className='text-sm'>No chats found</p>
                      </div>
                    ) : (
                      <div>
                        {searchResults.conversations.map((chat) => (
                          <div
                            key={chat._id}
                            className='hover:bg-accent flex cursor-pointer items-center border-b px-4 py-2 transition-colors last:border-0'
                            onClick={() => handleNavigate(`/messages/${chat._id}`)}
                          >
                            {chat.type === CHAT_TYPE.GROUP ? (
                              <div className='bg-muted mr-3 flex h-8 w-8 items-center justify-center rounded-full border'>
                                <Users className='text-muted-foreground h-4 w-4' />
                              </div>
                            ) : (
                              <Avatar className='mr-3 h-8 w-8 border'>
                                <AvatarImage src={chat.participants?.[0]?.avatar} alt={chat.participants?.[0]?.name} />
                                <AvatarFallback>{chat.participants?.[0]?.name?.[0]}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <p className='text-sm font-medium'>{getChatDisplayName(chat)}</p>
                              <p className='text-muted-foreground text-xs'>
                                {chat.type === CHAT_TYPE.GROUP
                                  ? `${chat.participants?.length || 0} members`
                                  : 'Direct message'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop version
  return (
    <div
      className={cn({
        hidden: !session,
        'relative w-full max-w-md': true
      })}
      ref={searchRef}
    >
      <div className='relative w-full'>
        <form className='relative' onSubmit={(e) => e.preventDefault()}>
          {isPending ? (
            <Loader2 className='absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 animate-spin opacity-50' />
          ) : (
            <Search className='pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 opacity-50' />
          )}
          <Input
            ref={inputRef}
            type='text'
            placeholder='Search users, posts, or chats...'
            className='bg-background w-full rounded-full border px-9 py-2 text-sm focus-visible:outline-none'
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={isPending}
            onFocus={() => setIsOpen(true)}
          />
          {searchQuery && (
            <Button
              variant='ghost'
              size='icon'
              className='absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2'
              onClick={() => {
                setSearchQuery('')
                setDebouncedQuery('')
                inputRef.current?.focus()
              }}
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </form>

        {isOpen && searchQuery.length > 0 && !isPending && (
          <div className='bg-background absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border shadow-md'>
            {isSearching ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                <span>Searching...</span>
              </div>
            ) : !debouncedQuery.trim() ? (
              <div className='text-muted-foreground py-6 text-center text-sm'>Type to search...</div>
            ) : (
              <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as SearchTab)}>
                <div className='border-b'>
                  <TabsList className='h-10 w-full justify-start px-2 pb-3'>
                    <TabsTrigger value='all' className='text-xs'>
                      All
                    </TabsTrigger>
                    <TabsTrigger value='users' className='text-xs'>
                      Users
                    </TabsTrigger>
                    <TabsTrigger value='posts' className='text-xs'>
                      Posts
                    </TabsTrigger>
                    <TabsTrigger value='chats' className='text-xs'>
                      Chats
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className='max-h-[400px] overflow-y-auto'>
                  <TabsContent value='all' className='mt-0 p-0'>
                    {searchResults.users.length === 0 &&
                    searchResults.posts.length === 0 &&
                    searchResults.conversations.length === 0 ? (
                      <div className='text-muted-foreground flex h-32 items-center justify-center'>
                        No results found
                      </div>
                    ) : (
                      <div className='divide-y'>
                        {/* Users */}
                        {searchResults.users.length > 0 && (
                          <div className='py-2'>
                            <h3 className='text-muted-foreground mb-2 px-4 text-sm font-medium'>Users</h3>
                            <div className='space-y-1'>
                              {searchResults.users.map((user) => (
                                <div
                                  key={user._id}
                                  className='hover:bg-accent flex cursor-pointer items-center px-4 py-2'
                                  onClick={() => handleNavigate(`/profile/${user.username || user._id}`)}
                                >
                                  <Avatar className='mr-3 h-10 w-10'>
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className='font-medium'>{user.name}</p>
                                    {user.username && <p className='text-muted-foreground text-sm'>@{user.username}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Posts */}
                        {searchResults.posts.length > 0 && (
                          <div className='py-2'>
                            <h3 className='text-muted-foreground mb-2 px-4 text-sm font-medium'>Posts</h3>
                            <div className='space-y-1'>
                              {searchResults.posts.map((post) => (
                                <div
                                  key={post._id}
                                  className='hover:bg-accent flex cursor-pointer items-center px-4 py-2'
                                  onClick={() => handleNavigate(`/posts/${post._id}`)}
                                >
                                  {post.media && post.media.length > 0 ? (
                                    <div className='mr-3 h-10 w-10 overflow-hidden rounded'>
                                      <img src={post.media[0].url} alt='' className='h-full w-full object-cover' />
                                    </div>
                                  ) : (
                                    <div className='bg-accent mr-3 flex h-10 w-10 items-center justify-center rounded'>
                                      <FileText className='h-5 w-5' />
                                    </div>
                                  )}
                                  <div>
                                    <p className='line-clamp-2'>{post.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Chats */}
                        {searchResults.conversations.length > 0 && (
                          <div className='py-2'>
                            <h3 className='text-muted-foreground mb-2 px-4 text-sm font-medium'>Chats</h3>
                            <div className='space-y-1'>
                              {searchResults.conversations.map((chat) => (
                                <div
                                  key={chat._id}
                                  className='hover:bg-accent flex cursor-pointer items-center px-4 py-2'
                                  onClick={() => handleNavigate(`/messages/${chat._id}`)}
                                >
                                  {chat.type === CHAT_TYPE.GROUP ? (
                                    <div className='bg-accent mr-3 flex h-10 w-10 items-center justify-center rounded-full'>
                                      <Users className='h-5 w-5' />
                                    </div>
                                  ) : (
                                    <Avatar className='mr-3 h-10 w-10'>
                                      <AvatarImage
                                        src={chat.participants?.[0]?.avatar}
                                        alt={chat.participants?.[0]?.name}
                                      />
                                      <AvatarFallback>{chat.participants?.[0]?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div>
                                    <p className='font-medium'>{getChatDisplayName(chat)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='users' className='mt-0 p-0'>
                    {searchResults.users.length === 0 ? (
                      <div className='text-muted-foreground flex h-32 items-center justify-center'>No users found</div>
                    ) : (
                      <div className='space-y-1'>
                        {searchResults.users.map((user) => (
                          <div
                            key={user._id}
                            className='hover:bg-accent flex cursor-pointer items-center px-4 py-2'
                            onClick={() => handleNavigate(`/profile/${user.username || user._id}`)}
                          >
                            <Avatar className='mr-3 h-10 w-10'>
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className='font-medium'>{user.name}</p>
                              {user.username && <p className='text-muted-foreground text-sm'>@{user.username}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='posts' className='mt-0 p-0'>
                    {searchResults.posts.length === 0 ? (
                      <div className='text-muted-foreground flex h-32 items-center justify-center'>No posts found</div>
                    ) : (
                      <div className='space-y-1'>
                        {searchResults.posts.map((post) => (
                          <div
                            key={post._id}
                            className='hover:bg-accent flex cursor-pointer items-center px-4 py-2'
                            onClick={() => handleNavigate(`/posts/${post._id}`)}
                          >
                            {post.media && post.media.length > 0 ? (
                              <div className='mr-3 h-10 w-10 overflow-hidden rounded'>
                                <img src={post.media[0].url} alt='' className='h-full w-full object-cover' />
                              </div>
                            ) : (
                              <div className='bg-accent mr-3 flex h-10 w-10 items-center justify-center rounded'>
                                <FileText className='h-5 w-5' />
                              </div>
                            )}
                            <div>
                              <p className='line-clamp-2'>{post.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='chats' className='mt-0 p-0'>
                    {searchResults.conversations.length === 0 ? (
                      <div className='text-muted-foreground flex h-32 items-center justify-center'>No chats found</div>
                    ) : (
                      <div className='space-y-1'>
                        {searchResults.conversations.map((chat) => (
                          <div
                            key={chat._id}
                            className='hover:bg-accent flex cursor-pointer items-center px-4 py-2'
                            onClick={() => handleNavigate(`/messages/${chat._id}`)}
                          >
                            {chat.type === CHAT_TYPE.GROUP ? (
                              <div className='bg-accent mr-3 flex h-10 w-10 items-center justify-center rounded-full'>
                                <Users className='h-5 w-5' />
                              </div>
                            ) : (
                              <Avatar className='mr-3 h-10 w-10'>
                                <AvatarImage src={chat.participants?.[0]?.avatar} alt={chat.participants?.[0]?.name} />
                                <AvatarFallback>{chat.participants?.[0]?.name?.[0]}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <p className='font-medium'>{getChatDisplayName(chat)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HeaderSearch
