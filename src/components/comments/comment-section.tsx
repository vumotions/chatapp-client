/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { JSX, useCallback, useEffect, useRef, useState } from 'react'
import { CommentForm } from '~/components/comments/comment-form'
import { Button } from '~/components/ui/button'
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateCommentMutation,
  useLikeCommentMutation
} from '~/hooks/data/comment.hooks'
import commentService from '~/services/comment.service'
import CommentItem from './comment-item'

interface CommentSectionProps {
  postId: string
  focusCommentId?: string
}

export default function CommentSection({ postId, focusCommentId }: CommentSectionProps) {
  const { data: session } = useSession()
  const user = session?.user
  const queryClient = useQueryClient()
  const t = useTranslations()
  const focusedCommentRef = useRef<HTMLDivElement>(null)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const {
    data: commentsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: ({ pageParam }) => commentService.getComments(postId, pageParam, 10).then((res) => res.data),
    getNextPageParam: (lastPage: any) => {
      const { currentPage, totalPages } = lastPage.pagination
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 1
  })
  const createComment = useCreateCommentMutation()
  const deleteComment = useDeleteCommentMutation(postId)
  const updateComment = useUpdateCommentMutation(postId)
  const likeComment = useLikeCommentMutation(postId)
  useEffect(() => {
    if (focusCommentId && focusedCommentRef.current) {
      focusedCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      focusedCommentRef.current.style.backgroundColor = '#f0f2ff'
      setTimeout(() => (focusedCommentRef.current!.style.backgroundColor = ''), 2000)
    }
  }, [focusCommentId])
  const canEditDelete = useCallback((commentAuthor: any) => user?._id === commentAuthor._id, [user])
  const handleCreateComment = async (content: string, parentId: string | null = null) => {
    try {
      const mentions = extractMentions(content)
      await createComment.mutateAsync(
        {
          postId,
          content,
          parentId,
          mentions: mentions.map((mention) => mention.userId)
        },
        {
          onSuccess: async () => {
            await refetch()
          }
        }
      )
    } catch (error) {
      console.error('Error creating comment:', error)
    }
  }

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      await updateComment.mutateAsync(
        { commentId, data: { content } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', postId] })
          }
        }
      )
    } catch (error) {
      console.error('Error updating comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['comments', postId] })
        }
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    try {
      await likeComment.mutateAsync(commentId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['comments', postId] })
        }
      })
    } catch (error) {
      console.error('Error liking comment:', error)
    }
  }

  const extractMentions = (content: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: { name: string; userId: string }[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({ name: match[1], userId: match[2] })
    }
    return mentions
  }
  const renderCommentContent = (content: string): JSX.Element | JSX.Element[] => {
    if (!content) {
      return <span>No content</span>
    }
    const parts = content.split(/(@\[.*?\]\(.*?\))/g)
    return parts.map((part, index) => {
      const match = part.match(/@\[(.*?)\]\((.*?)\)/)
      if (match) {
        return (
          <span
            key={index}
            className='cursor-pointer text-blue-600 hover:underline'
            onClick={() => router.push(`/profile/${match[2]}`)}
          >
            @{match[1]}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }
  const toggleReplies = (commentId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }
  const renderComments = (comments: any[], level = 0, isRoot = true) => {
    return comments.map((comment) => {
      if (isRoot && comment.parentId) return null
      return (
        <div key={comment._id}>
          <CommentItem
            comment={comment}
            level={level}
            handleUpdateComment={handleUpdateComment}
            handleDeleteComment={handleDeleteComment}
            handleCreateComment={handleCreateComment}
            handleLikeComment={handleLikeComment}
            postId={postId}
            renderCommentContent={renderCommentContent}
            canEditDelete={canEditDelete}
            ref={comment._id === focusCommentId ? focusedCommentRef : null}
          />
          {comment.comments?.length > 0 && (
            <>
              <div onClick={() => toggleReplies(comment._id)} className='ml-[50px] cursor-pointer'>
                {expandedComments[comment._id]
                  ? t('comments.hideReplies')
                  : t('comments.viewAllReplies', { count: comment.comments.length })}
              </div>
              {expandedComments[comment._id] && <div>{renderComments(comment.comments, level + 1, false)}</div>}
            </>
          )}
        </div>
      )
    })
  }
  const findParentIds = (pages: any[], targetId: string): string[] => {
    let path: string[] = []

    const search = (comments: any[], targetId: string, currentPath: string[]): boolean => {
      for (const comment of comments) {
        const newPath = [...currentPath, comment._id]
        if (comment._id === targetId) {
          path = newPath
          return true
        }
        if (comment.comments?.length > 0) {
          const found = search(comment.comments, targetId, newPath)
          if (found) return true
        }
      }
      return false
    }

    for (const page of pages) {
      if (search(page.comments, targetId, [])) break
    }
    return path.slice(0, -1) // Loại bỏ ID của chính comment đích
  }
  useEffect(() => {
    if (focusCommentId && commentsData?.pages) {
      const parentIds = findParentIds(commentsData.pages, focusCommentId)
      setExpandedComments((prev) => ({
        ...prev,
        ...parentIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
      }))
    }
  }, [focusCommentId, commentsData])
  useEffect(() => {
    if (focusCommentId && !isFetchingNextPage) {
      const element = document.getElementById(`comment-${focusCommentId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.style.backgroundColor = '#f0f2ff'
        setTimeout(() => (element.style.backgroundColor = ''), 2000)
      }
    }
  }, [focusCommentId, isFetchingNextPage, commentsData])
  return (
    <div className='space-y-4'>
      {/* Comment input */}
      {/* <div className='flex items-start gap-2'>
        <Avatar className='h-8 w-8'>
          <AvatarImage src={session?.user?.avatar || ''} alt={session?.user?.name || ''} />
          <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar> */}
      {/* <div className='flex-1'>
          <Textarea
            placeholder='Viết bình luận...'
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className='min-h-[60px] resize-none'
          />
          <div className='mt-2 flex justify-end'>
            <Button size='sm' onClick={handleSubmitComment} disabled={!commentText.trim() || isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi'}
            </Button>
          </div>
        </div> */}
      {/* </div> */}

      {/* Comments list */}
      <div className='space-y-4'>
        {commentsData?.pages?.map((page, i) => <div key={i}>{renderComments(page.data, 0, true)}</div>)}
        {isFetchingNextPage && <p className='text-muted-foreground text-center'>Đang tải bình luận...</p>}
        {!isFetchingNextPage && commentsData?.pages.length === 0 && (
          <p className='text-muted-foreground text-center'>Chưa có bình luận nào</p>
        )}
        {hasNextPage && (
          <Button variant='ghost' className='w-full' onClick={() => fetchNextPage()}>
            Xem thêm bình luận
          </Button>
        )}
        <div className='mt-4 rounded-lg p-4 shadow'>
          <CommentForm
            onSubmit={(content) => {
              handleCreateComment(content)
            }}
          />
        </div>
      </div>
    </div>
  )
}
