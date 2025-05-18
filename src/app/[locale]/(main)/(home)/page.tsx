'use client'

import { Heart, Images, Link as LinkIcon, MessageCircle, Send, SmilePlus } from 'lucide-react'
import PostSkeleton from '~/components/post-skeleton'
import Protected from '~/components/protected'
import SharePopover from '~/components/share-popover'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import nextEnv from '~/config/next-env'

import RightSidebarFriendList from './components/right-sidebar'

import { useSession } from 'next-auth/react'
import { cn } from '~/lib/utils'
import FriendSuggestions from '~/components/friend-suggestions'
import useMediaQuery from '~/hooks/use-media-query'
import PostEditorV2 from '~/components/posts/post-editor-v2'
import { useEffect, useState } from 'react'
import postService from '~/services/post.service'
import Image from 'next/image'
import Post from '~/components/posts/post'

function Home() {
  const { data: session } = useSession()
  const [postData, setPostData] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const getPosts = async () => {
    setIsLoading(true)
    const data = await postService.getPosts({
      postTypes: ['friend', 'public'],
      limit: 10,
      page: 1
    })
    if (data.statusText === 'OK') {
      setPostData(data?.data?.data)
    }
    setIsLoading(false)
  }
  useEffect(() => {
    getPosts()
  }, [])
  // const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <div className='mx-auto flex max-w-screen-2xl gap-4 py-4 lg:flex-row'>
      {/* Main Content */}
      <div className='flex flex-1 flex-col gap-4'>
        {/* Status input */}
        <PostEditorV2 getPosts={getPosts} />
        {/* Post */}
        <FriendSuggestions />
        <PostSkeleton />
        {postData.map((post) => {
          return (
              <Post key={post._id} post={post}/>
          )
        })}
      </div>

      {/* Right Sidebar (friends list) */}

      <RightSidebarFriendList />
    </div>
  )
}

export default Home
