/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, MoreVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { CommentForm } from '~/components/comments/comment-form'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

interface CommentItemProps {
  comment: any
  level: number
  handleUpdateComment: (commentId: string, content: string) => void
  handleDeleteComment: (commentId: string) => void
  handleCreateComment: (content: string, parentId?: string | null) => void
  handleLikeComment: (commentId: string) => void
  postId: string
  renderCommentContent: any
  canEditDelete: (commentUserId: any) => boolean
  ref?: React.Ref<HTMLDivElement>
}

export default function CommentItem({
  comment,
  level,
  handleUpdateComment,
  handleDeleteComment,
  handleCreateComment,
  handleLikeComment,
  renderCommentContent,
  canEditDelete,
  ref
}: CommentItemProps) {
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const t = useTranslations()

  return (
    <div id={`comment-${comment._id}`} ref={ref} className='space-y-2' style={{ marginLeft: `${level * 20}px` }}>
      {/* Main comment */}
      <div className='flex items-start gap-2'>
        <Avatar className='h-8 w-8'>
          <AvatarImage src={comment.userId?.avatar || ''} alt={comment.userId?.name || ''} />
          <AvatarFallback>{comment.userId?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <div className='bg-muted rounded-lg p-3'>
            <div className='font-medium'>{comment.userId?.name || 'Người dùng'}</div>
            {editing ? (
              <EditCommentForm
                initialContent={comment.content}
                onCancel={() => setEditing(false)}
                onSave={(content: any) => {
                  handleUpdateComment(comment._id, content)
                  setEditing(false)
                }}
              />
            ) : (
              <div className='flex items-center justify-between'>
                <div className='mt-1 text-sm text-gray-800'>{renderCommentContent(comment.content)}</div>
                {canEditDelete(comment.userId) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='icon' className='h-6 w-6 cursor-pointer p-0 text-gray-500'>
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='absolute right-0 z-30 mt-2 w-28 rounded-md bg-white p-1 shadow-lg'>
                      <DropdownMenuItem
                        className='cursor-pointer p-2 hover:bg-gray-100'
                        onClick={() => setEditing(true)}
                      >
                        {t('comments.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='cursor-pointer p-2 hover:bg-gray-100'
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        {t('comments.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
          <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
            <Button
              variant='ghost'
              size='sm'
              className='flex h-auto items-center gap-1 p-0 text-xs font-medium'
              onClick={() => handleLikeComment(comment._id)}
            >
              {comment.userLiked ? (
                <Heart className='h-3 w-3 fill-red-500 text-red-500' />
              ) : (
                <Heart className='h-3 w-3' />
              )}
              {(comment.likesCount ?? 0) > 0 && <span>{comment.likesCount}</span>}
            </Button>
            <span>
              {formatDistanceToNow(new Date(comment.createdAt || Date.now()), {
                addSuffix: true,
                locale: vi
              })}
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='h-auto p-0 text-xs font-medium'
              onClick={() => setReplying(true)}
            >
              Phản hồi
            </Button>
          </div>
          {replying && (
            <div className='mt-2'>
              <CommentForm
                onSubmit={(content: any) => {
                  handleCreateComment(content, comment._id)
                  setReplying(false)
                }}
                mentionTag={`@${comment.userId.name}`}
                parentId={comment._id}
                onCancel={() => setReplying(false)}
                replyToUserId={comment.userId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const EditCommentForm = ({ initialContent, onCancel, onSave }: { initialContent: any; onCancel: any; onSave: any }) => {
  const [content, setContent] = useState(initialContent)
  const t = useTranslations()
  return (
    <div className='flex flex-col gap-2'>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className='rounded-lg border-none bg-gray-100'
      />
      <div className='flex justify-end gap-2'>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={() => onSave(content)}>{t('comments.saveChanges')}</Button>
      </div>
    </div>
  )
}
