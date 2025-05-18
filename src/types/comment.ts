export interface Comment {
  _id: string
  tempId?: string
  userId: {
    _id: string
    name: string
    avatar: string
  }
  postId: string
  content: string
  parentId?: string
  createdAt: string
  isLocal?: boolean
  likesCount?: number
  userLiked?: boolean
}
