'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Post from '~/components/posts/post'
import postService from '~/services/post.service'
import { Container } from '~/components/ui/container'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import Link from 'next/link'

export default function PostDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

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
            <h1 className='mb-4 text-2xl font-bold'>Bài viết không tồn tại</h1>
            <p className='text-muted-foreground mb-6'>{error || 'Bài viết có thể đã bị xóa hoặc không tồn tại.'}</p>
            <Button asChild>
              <Link href='/feed'>Quay lại trang chủ</Link>
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
