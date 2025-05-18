import { CHAT_TYPE, MESSAGE_TYPE } from '~/constants/enums'

export type Chat = {
  _id: string
  userId: string
  type: CHAT_TYPE | string
  name?: string
  avatar?: string
  lastMessage?: string
  participants: string[]
  createdAt: string
  updatedAt: string
  read: boolean
}

export type Message = {
  _id: string
  chatId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  readBy: string[]
  type: MESSAGE_TYPE
  isPinned?: boolean
}
