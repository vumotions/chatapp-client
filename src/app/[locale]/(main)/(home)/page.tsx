'use client'

import { useQueryClient } from '@tanstack/react-query'
import InfiniteScroll from 'react-infinite-scroll-component'
import FriendSuggestions from '~/components/friend-suggestions'
import { Post } from '~/components/posts/post'
import PostEditorV2 from '~/components/posts/post-editor-v2'
import { PostSkeleton } from '~/components/posts/post-skeleton'
import { usePosts } from '~/hooks/data/post.hooks'
import { useHomeTranslation } from '~/hooks/use-translations'
import RightSidebarFriendList from './components/right-sidebar'

function Home() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, fetchNextPage, hasNextPage } = usePosts()
  const t = useHomeTranslation()

  // Làm phẳng danh sách bài viết từ tất cả các trang
  const posts = data?.pages.flatMap((page) => page.posts) || []

  // Hàm để làm mới danh sách bài viết
  const refreshPosts = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['POSTS'] })
    } catch (error) {
      console.error('Error refreshing posts:', error)
    }
  }

  return (
    <div className='mx-auto flex max-w-screen-2xl gap-4 py-4 lg:flex-row'>
      {/* Main Content */}
      <div className='flex flex-1 flex-col gap-4'>
        {/* Status input */}
        <PostEditorV2 getPosts={refreshPosts} />
        {/* Post */}
        <FriendSuggestions />

        {/* Sử dụng InfiniteScroll để tải thêm bài viết khi cuộn */}
        <InfiniteScroll
          dataLength={posts.length || 0}
          next={fetchNextPage}
          hasMore={!!hasNextPage}
          loader={
            <div className='space-y-4'>
              <PostSkeleton />
              <PostSkeleton />
            </div>
          }
          endMessage={<div className='text-muted-foreground p-2 text-center text-xs'>{t('noMorePosts')}</div>}
        >
          {isLoading ? (
            // Initial loading state
            <div className='space-y-4'>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : isError ? (
            <div className='text-muted-foreground p-4 text-center'>{t('errorLoadingPosts')}</div>
          ) : posts.length === 0 ? (
            <div className='text-muted-foreground p-4 text-center'>{t('noPosts')}</div>
          ) : (
            posts.map((post) => <Post key={post._id} post={post} />)
          )}
        </InfiniteScroll>
      </div>

      {/* Right Sidebar (friends list) */}
      <RightSidebarFriendList />
    </div>
  )
}

export default Home
