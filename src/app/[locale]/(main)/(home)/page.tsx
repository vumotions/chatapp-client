'use client'

import PostSkeleton from '~/components/post-skeleton'
import { Post } from '~/components/posts/post'

import RightSidebarFriendList from './components/right-sidebar'

import { useSession } from 'next-auth/react'
import { cn } from '~/lib/utils'
import FriendSuggestions from '~/components/friend-suggestions'
import useMediaQuery from '~/hooks/use-media-query'
import PostEditorV2 from '~/components/posts/post-editor-v2'
import { useState, useEffect } from 'react'
import postService from '@/services/post.service'
import { toast } from 'sonner'

function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await postService.getPosts(currentPage, 10)
      if (response && response.data) {
        const newPosts = response.data.data || []
        setPosts(prev => currentPage === 1 ? newPosts : [...prev, ...newPosts])
        setHasMore(response.data.data.hasMore || false)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Không thể tải bài viết')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [currentPage])

  // const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <div className='mx-auto flex max-w-screen-2xl gap-4 py-4 lg:flex-row'>
      {/* Main Content */}
      <div className='flex flex-1 flex-col gap-4'>
        {/* Status input */}
        <PostEditorV2 getPosts={fetchPosts} />
        {/* Post */}
        <FriendSuggestions />
        {loading && !posts.length ? (
          // Initial loading state
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : null}
        {/* <PostSkeleton /> */}
        {!loading && posts.map((post) => {
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
