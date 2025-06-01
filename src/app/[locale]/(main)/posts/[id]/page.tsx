'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Post from '~/components/posts/post'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Container } from '~/components/ui/container'
import { usePostTranslation } from '~/hooks/use-translations'
import postService from '~/services/post.service'

export default function PostDetailPage() {
  const t = usePostTranslation()
  const params = useParams()
  const id = params.id as string
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const response = await postService.getPostById(id)
        setPost(response.data.data)
      } catch (error) {
        console.error('Failed to fetch post:', error)
        setError('Không thể tải bài viết. Bài viết có thể đã bị xóa hoặc không tồn tại.')
        toast.error('Không thể tải bài viết')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPost()
    }
  }, [id])

  if (loading) {
    return (
      <Container className='py-8'>
        <div className='flex min-h-[50vh] items-center justify-center'>
          <Loader2 className='text-primary h-8 w-8 animate-spin' />
        </div>
      </Container>
    )
  }

  if (error || !post) {
    return (
      <Container className='py-8'>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
            <h1 className='mb-4 text-2xl font-bold'>{t('posts.postNotExist')}</h1>
            <p className='text-muted-foreground mb-6'>{error || t('posts.postMayBeDeleted')}</p>
            <Button asChild>
              <Link href='/feed'>{t('posts.backToHome')}</Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
    )
  }

  return (
    <Container className='py-8'>
      <div className='mx-auto max-w-2xl'>
        <Post post={post} />
      </div>
    </Container>
  )
}
