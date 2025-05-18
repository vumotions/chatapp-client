// Định nghĩa model cho draft message
export interface IDraft {
  _id?: string
  chatId: string
  userId: string
  content: string
  attachments?: any[]
  createdAt?: Date
  updatedAt?: Date
}
