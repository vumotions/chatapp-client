/* eslint-disable @typescript-eslint/no-explicit-any */
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import friendService from '~/services/friend.service'

export const CommentForm = ({
  onSubmit,
  mentionTag = '',
  parentId = null,
  onCancel,
  replyToUserId
}: {
  onSubmit: (content: string, parentId?: string | null) => void
  mentionTag?: string
  parentId?: string | null
  onCancel?: () => void
  replyToUserId?: any
}) => {
  const [content, setContent] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const mentionInputRef = useRef<HTMLDivElement>(null)
  const { data: dataSession } = useSession()
  const user = dataSession?.user as any
  const t = useTranslations()

  // Set initial content with mention when component mounts
  useEffect(() => {
    if (mentionTag && mentionTag.startsWith('@') && replyToUserId) {
      const name = mentionTag.substring(1)
      setContent(`@${name} `)
      // Store the actual mention data in a hidden format
      if (mentionInputRef.current) {
        mentionInputRef.current.dataset.mentions = JSON.stringify([
          {
            name: name,
            userId: replyToUserId._id,
            position: 0
          }
        ])
      }
      // Auto focus textarea after setting content
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus()
          const newPosition = name.length + 2 // @name + space
          textAreaRef.current.setSelectionRange(newPosition, newPosition)
        }
      }, 100)
    }
  }, [mentionTag, replyToUserId])

  // Get friends list for mention
  const { data: friendsData } = useQuery({
    queryKey: ['friends', mentionQuery],
    queryFn: () => friendService.getFriendsList(mentionQuery),
    enabled: showMentions && mentionQuery.length >= 0
  })

  // Get all users for mention (fallback if no friends found)
  const { data: usersData } = useQuery({
    queryKey: ['users', 'search', mentionQuery],
    queryFn: () => friendService.searchUsers(mentionQuery),
    enabled: showMentions && mentionQuery.length >= 1
  })

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const position = e.target.selectionStart
    setContent(newContent)
    setCursorPosition(position)

    // Check if we should show mentions
    const lastAtSymbol = newContent.lastIndexOf('@', position)
    if (lastAtSymbol !== -1) {
      const nextSpace = newContent.indexOf(' ', lastAtSymbol)
      const endPosition = nextSpace === -1 ? newContent.length : nextSpace
      if (position > lastAtSymbol && position <= endPosition) {
        const query = newContent.slice(lastAtSymbol + 1, position)
        setMentionQuery(query)
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Close mentions dropdown on Escape
    if (e.key === 'Escape' && showMentions) {
      setShowMentions(false)
      e.preventDefault()
    }
  }

  // Close mentions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionInputRef.current && !mentionInputRef.current.contains(event.target as Node)) {
        setShowMentions(false)
      }
    }

    if (showMentions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMentions])

  const insertMention = (friend: any) => {
    const beforeMention = content.slice(0, content.lastIndexOf('@', cursorPosition))
    const afterMention = content.slice(cursorPosition)

    // Store the mention data
    const mentions = mentionInputRef.current?.dataset.mentions
      ? JSON.parse(mentionInputRef.current.dataset.mentions)
      : []
    mentions.push({
      name: friend.name,
      userId: friend._id,
      position: beforeMention.length
    })
    if (mentionInputRef.current) {
      mentionInputRef.current.dataset.mentions = JSON.stringify(mentions)
    }

    // Update visible content
    const newContent = `${beforeMention}@${friend.name} ${afterMention}`
    setContent(newContent)
    setShowMentions(false)

    if (textAreaRef.current) {
      const newPosition = beforeMention.length + friend.name.length + 2 // +2 for @ and space
      textAreaRef.current.focus()
      textAreaRef.current.setSelectionRange(newPosition, newPosition)
    }
  }

  const handleSubmit = () => {
    if (content.trim()) {
      // Convert visible content to format with IDs using stored mention data
      let finalContent = content
      const mentions = mentionInputRef.current?.dataset.mentions
        ? JSON.parse(mentionInputRef.current.dataset.mentions)
        : []

      // Sort mentions by position in reverse order to avoid position shifts
      mentions.sort((a: any, b: any) => b.position - a.position)

      for (const mention of mentions) {
        const beforeMention = finalContent.slice(0, mention.position)
        const afterMention = finalContent.slice(mention.position + mention.name.length + 1) // +1 for @
        finalContent = `${beforeMention}@[${mention.name}](${mention.userId})${afterMention}`
      }

      onSubmit(finalContent)
      setContent('')
      if (mentionInputRef.current) {
        mentionInputRef.current.dataset.mentions = '[]'
      }
      if (onCancel) onCancel()
    }
  }

  return (
    <div className='relative flex items-start gap-3'>
      <Avatar className='h-8 w-8 overflow-hidden rounded-full'>
        <AvatarImage src={user?.avatar ?? ''} />
        <AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <div className='flex-1' ref={mentionInputRef}>
        <Textarea
          ref={textAreaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('comments.writeComment')}
          rows={2}
          className='rounded-lg border border-gray-300 bg-gray-100 text-base'
        />
        {showMentions && (
          <div className='absolute z-10 mt-1 max-h-60 w-full max-w-[594px] rounded-lg border border-gray-200 bg-white shadow-lg'>
            {/* Show friends first */}
            {friendsData?.data?.data && friendsData.data.data.length > 0 && (
              <>
                <div className='border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500'>Bạn bè</div>
                {friendsData.data.data.map((friend: any) => (
                  <div
                    key={`friend-${friend._id}`}
                    onClick={() => insertMention(friend)}
                    className='flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-blue-50'
                  >
                    <Avatar className='h-8 w-8'>
                      <AvatarImage
                        className='h-full w-full rounded-[50%]'
                        src={friend.avatar || ''}
                        alt={friend.name || ''}
                      />
                      <AvatarFallback className='bg-blue-100 text-blue-600'>
                        {friend.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <div className='text-sm font-medium'>{friend.name}</div>
                      {friend.username && <div className='text-xs text-gray-500'>@{friend.username}</div>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Show other users if query is long enough */}
            {usersData?.data?.data && usersData.data.data.length > 0 && (
              <>
                {friendsData?.data?.data && friendsData.data.data.length > 0 && (
                  <div className='border-t border-gray-100'></div>
                )}
                <div className='border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500'>Người dùng khác</div>
                {usersData.data.data
                  .filter((user: any) => {
                    // Filter out users that are already in friends list
                    const friendIds = friendsData?.data?.data?.map((f: any) => f._id) || []
                    return !friendIds.includes(user._id)
                  })
                  .map((user: any) => (
                    <div
                      key={`user-${user._id}`}
                      onClick={() => insertMention(user)}
                      className='flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-gray-50'
                    >
                      <Avatar className='h-8 w-8'>
                        <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                        <AvatarFallback className='bg-gray-100 text-gray-600'>
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex-1'>
                        <div className='text-sm font-medium'>{user.name}</div>
                        {user.username && <div className='text-xs text-gray-500'>@{user.username}</div>}
                      </div>
                    </div>
                  ))}
              </>
            )}

            {/* Show no results message */}
            {(!friendsData?.data?.data || friendsData.data.data.length === 0) &&
              (!usersData?.data?.data || usersData.data.data.length === 0) && (
                <div className='p-3 text-center text-sm text-gray-500'>Không tìm thấy người dùng nào</div>
              )}
          </div>
        )}
        <div className='mt-2 flex justify-end gap-2'>
          {onCancel && <Button onClick={onCancel}>{t('common.cancel')}</Button>}
          <Button onClick={handleSubmit}>{parentId ? t('comments.reply') : t('comments.send')}</Button>
        </div>
      </div>
    </div>
  )
}
