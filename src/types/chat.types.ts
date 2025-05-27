import { GROUP_TYPE } from '~/constants/enums'

export interface CreateGroupChatData {
  name: string
  participants: string[]
  avatar?: string
  groupType?: GROUP_TYPE
  requireApproval?: boolean
}
