import { zodResolver } from '@hookform/resolvers/zod'
import {
  Camera,
  Clock,
  Copy,
  Crown,
  LogOut,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  Trash,
  UserCog,
  UserMinus
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { Switch } from '~/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

import { useQueryClient } from '@tanstack/react-query'
import { addDays, addHours, addMinutes, format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Loader2, Upload } from 'lucide-react'
import { MAX_GROUP_MEMBERS } from '~/constants/app.constants'
import { GROUP_TYPE, MEMBER_ROLE } from '~/constants/enums'
import { useFriendsWithRolesQuery } from '~/hooks/data/friends.hook'
import {
  useDisbandGroupMutation,
  useGenerateInviteLinkMutation,
  useLeaveGroupMutation,
  useRemoveGroupMemberMutation,
  useUpdateGroupMutation,
  useUpdateMemberRoleMutation,
  useUpdateSendMessageRestrictionMutation
} from '~/hooks/data/group-chat.hooks'
import { useFileUpload } from '~/hooks/data/upload.hooks'
import { useMessagesTranslation } from '~/hooks/use-translations'
import { TransferOwnershipDialog } from './transfer-ownership-dialog'
import { Badge } from './ui/badge'

// Zod schema cho form cài đặt nhóm
const groupSettingsSchema = z.object({
  name: z.string().min(1, 'Tên nhóm không được để trống').max(50, 'Tên nhóm không quá 50 ký tự'),
  avatar: z.string().optional(),
  groupType: z.enum([GROUP_TYPE.PUBLIC, GROUP_TYPE.PRIVATE], {
    required_error: 'Vui lòng chọn loại nhóm'
  }),
  requireApproval: z.boolean().default(false)
})

// Zod schema cho form chỉnh sửa thành viên
const memberEditSchema = z.object({
  role: z.enum([MEMBER_ROLE.MEMBER, MEMBER_ROLE.ADMIN], {
    required_error: 'Vui lòng chọn vai trò'
  }),
  customTitle: z.string().max(30, 'Tiêu đề không quá 30 ký tự').optional(),
  permissions: z
    .object({
      changeGroupInfo: z.boolean().default(false),
      deleteMessages: z.boolean().default(false),
      banUsers: z.boolean().default(false),
      inviteUsers: z.boolean().default(true),
      pinMessages: z.boolean().default(false),
      addNewAdmins: z.boolean().default(false),
      approveJoinRequests: z.boolean().default(false)
    })
    .default({
      changeGroupInfo: false,
      deleteMessages: false,
      banUsers: false,
      inviteUsers: true,
      pinMessages: false,
      addNewAdmins: false,
      approveJoinRequests: false
    })
})

// Định nghĩa schema cho form cài đặt tin nhắn với validation chặt chẽ hơn
const messageRestrictionSchema = z.object({
  onlyAdminsCanSend: z.boolean().default(false),
  restrictionType: z.enum(['indefinite', 'until']).default('indefinite'),
  restrictionDuration: z.enum(['30', '60', '180', '1440', 'custom']).default('30'),
  customMinutes: z.number().optional()
})

type GroupSettingsValues = z.infer<typeof groupSettingsSchema>
type MemberEditValues = z.infer<typeof memberEditSchema>
type MessageRestrictionValues = z.infer<typeof messageRestrictionSchema>

export function GroupSettingsDialog({ conversation, onUpdate }: { conversation: any; onUpdate?: () => void }) {
  const messagesT = useMessagesTranslation()
  
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<any>(null)
  const [memberEditDialogOpen, setMemberEditDialogOpen] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<any>(null)
  const [inviteLink, setInviteLink] = useState(conversation?.inviteLink || '')
  const [confirmNewLinkDialogOpen, setConfirmNewLinkDialogOpen] = useState(false)
  const [transferOwnershipDialogOpen, setTransferOwnershipDialogOpen] = useState(false)
  const [leaveGroupConfirmOpen, setLeaveGroupConfirmOpen] = useState(false)
  const [disbandGroupConfirmOpen, setDisbandGroupConfirmOpen] = useState(false)
  const [isUpdatingRestriction, setIsUpdatingRestriction] = useState(false)

  // Thêm ref cho QR code
  const qrCodeRef = useRef<HTMLDivElement>(null)

  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  // Kiểm tra quyền
  const isOwner = useMemo(() => {
    if (!session?.user?._id || !conversation?.members) return false

    const currentMember = conversation.members.find((member: any) => member.userId === session?.user?._id)

    return currentMember?.role === 'OWNER'
  }, [session, conversation])
  const currentMember = conversation?.members?.find((m: any) => m.userId?.toString() === currentUserId?.toString())
  const isAdmin = isOwner || currentMember?.role === MEMBER_ROLE.ADMIN

  const canChangeGroupInfo = isAdmin && currentMember?.permissions?.changeGroupInfo

  // Form cho cài đặt nhóm
  const groupSettingsForm = useForm<GroupSettingsValues>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: {
      name: conversation?.name || '',
      groupType: conversation?.groupType || GROUP_TYPE.PUBLIC,
      requireApproval: conversation?.requireApproval || false
    }
  })
  const queryClient = useQueryClient()

  // Form cho chỉnh sửa thành viên
  const memberEditForm = useForm<MemberEditValues>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: {
      role: MEMBER_ROLE.MEMBER,
      customTitle: '',
      permissions: {
        changeGroupInfo: false,
        deleteMessages: false,
        banUsers: false,
        inviteUsers: true,
        pinMessages: false,
        addNewAdmins: false,
        approveJoinRequests: false
      }
    }
  })

  // Thêm form cho cài đặt tin nhắn
  const messageRestrictionForm = useForm<MessageRestrictionValues>({
    resolver: zodResolver(messageRestrictionSchema),
    defaultValues: {
      onlyAdminsCanSend: conversation?.onlyAdminsCanSend || false,
      restrictionType: conversation?.restrictUntil ? 'until' : 'indefinite',
      restrictionDuration: '60',
      customMinutes: 15
    }
  })

  // Lấy giá trị từ form
  const { watch, setValue } = messageRestrictionForm
  const onlyAdminsCanSend = watch('onlyAdminsCanSend')
  const restrictionType = watch('restrictionType')
  const restrictionDuration = watch('restrictionDuration')
  const customMinutes = watch('customMinutes')

  // Lấy danh sách thành viên với roles
  const { data, isLoading: isLoadingMembers } = useFriendsWithRolesQuery(open ? conversation?._id : undefined)

  // Trích xuất members từ data
  const membersWithRoles = data?.members || []

  // Lọc danh sách thành viên theo tìm kiếm
  const filteredMembers = Array.isArray(membersWithRoles)
    ? membersWithRoles
        .filter((member: any) => member.inGroup)
        .filter((member: any) => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  // Cập nhật form khi conversation thay đổi
  useEffect(() => {
    if (conversation) {
      groupSettingsForm.reset({
        name: conversation.name || '',
        avatar: conversation.avatar || '',
        groupType: conversation.groupType || GROUP_TYPE.PUBLIC,
        requireApproval: conversation.requireApproval || false
      })
      setInviteLink(conversation.inviteLink || '')
    }
  }, [conversation, groupSettingsForm])

  // Cập nhật form chỉnh sửa thành viên khi chọn thành viên
  useEffect(() => {
    if (memberToEdit) {
      memberEditForm.reset({
        role: memberToEdit.role || MEMBER_ROLE.MEMBER,
        customTitle: memberToEdit.customTitle || '',
        permissions: memberToEdit.permissions || {
          changeGroupInfo: false,
          deleteMessages: false,
          banUsers: false,
          inviteUsers: true,
          pinMessages: false,
          addNewAdmins: false,
          approveJoinRequests: false
        }
      })
    }
  }, [memberToEdit, memberEditForm])

  // Cập nhật form khi conversation thay đổi
  useEffect(() => {
    if (conversation) {
      setValue('onlyAdminsCanSend', conversation.onlyAdminsCanSend || false)
      setValue('restrictionType', conversation.restrictUntil ? 'until' : 'indefinite')

      // Nếu có restrictUntil, ước tính thời gian còn lại
      if (conversation.restrictUntil) {
        const now = new Date()
        const restrictUntil = new Date(conversation.restrictUntil)
        const diffMinutes = Math.round((restrictUntil.getTime() - now.getTime()) / (60 * 1000))

        if (diffMinutes <= 30) {
          setValue('restrictionDuration', '30')
        } else if (diffMinutes <= 60) {
          setValue('restrictionDuration', '60')
        } else if (diffMinutes <= 180) {
          setValue('restrictionDuration', '180')
        } else if (diffMinutes <= 1440) {
          setValue('restrictionDuration', '1440')
        } else {
          setValue('restrictionDuration', 'custom')
          setValue('customMinutes', diffMinutes)
        }
      }
    }
  }, [conversation, setValue])

  // Mutations
  const updateGroupMutation = useUpdateGroupMutation(conversation?._id, onUpdate)
  const generateInviteLinkMutation = useGenerateInviteLinkMutation(conversation?._id, (link) => setInviteLink(link))
  const leaveGroupMutation = useLeaveGroupMutation(conversation?._id)
  const removeUserMutation = useRemoveGroupMemberMutation(conversation?._id)
  const updateMemberRoleMutation = useUpdateMemberRoleMutation(conversation?._id)
  const disbandGroupMutation = useDisbandGroupMutation(conversation?._id)
  const updateRestrictionMutation = useUpdateSendMessageRestrictionMutation()

  const onSubmitGroupSettings = async (data: GroupSettingsValues) => {
    await updateGroupMutation.mutateAsync(data)
    // Revalidate chat list
    queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'], exact: false })
    // Revalidate chat details
    queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
    // Revalidate members
    queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', conversation._id] })
  }

  const onSubmitMemberEdit = async (data: MemberEditValues) => {
    if (!memberToEdit) {
      console.error('No member to edit')
      return
    }

    // Đảm bảo permissions luôn có giá trị
    let permissions = data.permissions || {
      changeGroupInfo: false,
      deleteMessages: false,
      banUsers: false,
      inviteUsers: true,
      pinMessages: false,
      addNewAdmins: false,
      approveJoinRequests: false
    }

    // Nếu người dùng hiện tại là admin (không phải owner) và đang thăng cấp thành viên lên admin
    if (!isOwner && currentMember?.role === MEMBER_ROLE.ADMIN && data.role === MEMBER_ROLE.ADMIN) {
      // Giới hạn các quyền nhạy cảm
      permissions = {
        ...permissions,
        addNewAdmins: false, // Admin không thể cấp quyền này cho admin mới
        banUsers: false, // Admin không thể cấp quyền xóa/cấm thành viên
        approveJoinRequests: false // Admin không thể cấp quyền phê duyệt thành viên mới
      }
    }

    await updateMemberRoleMutation.mutateAsync({
      userId: memberToEdit._id,
      role: data.role,
      permissions: permissions,
      customTitle: data.customTitle
    })
    // Revalidate member list
    queryClient.invalidateQueries({ queryKey: ['FRIENDS_WITH_ROLES', conversation._id] })
    // Revalidate messages to show system message about role change
    queryClient.invalidateQueries({ queryKey: ['MESSAGES', conversation._id] })
    // Revalidate chat list to update any UI elements showing member roles
    queryClient.invalidateQueries({ queryKey: ['CHAT_LIST'], exact: false })

    setMemberEditDialogOpen(false)
  }

  // Xử lý rời nhóm
  const handleLeaveGroup = () => {
    if (isOwner) {
      // Nếu là chủ nhóm, mở dialog chuyển quyền
      setTransferOwnershipDialogOpen(true)
    } else {
      // Nếu không phải chủ nhóm, mở dialog xác nhận rời nhóm
      setLeaveGroupConfirmOpen(true)
    }
  }

  // Xác nhận rời nhóm (cho thành viên không phải chủ nhóm)
  const handleConfirmLeaveGroup = () => {
    leaveGroupMutation.mutate()
    setLeaveGroupConfirmOpen(false)
  }

  // Xử lý sau khi chuyển quyền chủ nhóm thành công
  const handleTransferOwnershipComplete = () => {
    toast.success('Đã chuyển quyền chủ nhóm thành công')
    setTransferOwnershipDialogOpen(false)
    if (onUpdate) onUpdate()
  }

  const handleCopyInviteLink = () => {
    const fullLink = `${window.location.origin}/group/join/${inviteLink}`
    navigator.clipboard.writeText(fullLink)
    toast.success('Đã sao chép link mời')
  }

  const handleGenerateNewLink = () => {
    setConfirmNewLinkDialogOpen(true)
  }

  const confirmGenerateNewLink = () => {
    generateInviteLinkMutation.mutate()
    setConfirmNewLinkDialogOpen(false)
  }

  const handleRemoveUser = (member: any) => {
    setMemberToRemove(member)
    setConfirmDialogOpen(true)
  }

  const confirmRemoveUser = () => {
    if (memberToRemove) {
      removeUserMutation.mutate(memberToRemove._id)
      setConfirmDialogOpen(false)
    }
  }

  const handleEditMember = (member: any) => {
    // Chuẩn bị dữ liệu thành viên trước khi điền vào form
    const preparedMember = {
      ...member,
      // Đảm bảo các trường cần thiết tồn tại
      role: member.role || MEMBER_ROLE.MEMBER,
      customTitle: member.customTitle || '',
      permissions: member.permissions || {
        changeGroupInfo: false,
        deleteMessages: false,
        banUsers: false,
        inviteUsers: true,
        pinMessages: false,
        addNewAdmins: false,
        approveJoinRequests: false
      }
    }

    setMemberToEdit(preparedMember)

    // Điền dữ liệu trực tiếp vào form
    memberEditForm.reset({
      role: preparedMember.role,
      customTitle: preparedMember.customTitle,
      permissions: preparedMember.permissions
    })

    setMemberEditDialogOpen(true)
  }

  // Hiển thị biểu tượng cho role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case MEMBER_ROLE.OWNER:
        return <Crown className='h-4 w-4 text-yellow-500' />
      case MEMBER_ROLE.ADMIN:
        return <Shield className='h-4 w-4 text-blue-500' />
      default:
        return null
    }
  }

  // Hiển thị tên role
  const getRoleName = (role: string) => {
    switch (role) {
      case MEMBER_ROLE.OWNER:
        return messagesT('owner')
      case MEMBER_ROLE.ADMIN:
        return messagesT('admin')
      case MEMBER_ROLE.MEMBER:
        return messagesT('member')
      default:
        return messagesT('member')
    }
  }

  const handleDisbandGroup = () => {
    setDisbandGroupConfirmOpen(true)
  }

  const confirmDisbandGroup = () => {
    disbandGroupMutation.mutate()
    setDisbandGroupConfirmOpen(false)
  }

  // Xử lý cập nhật cài đặt tin nhắn
  const handleUpdateRestriction = async (data: MessageRestrictionValues) => {
    if (!conversation?._id) return

    // Kiểm tra nếu chọn custom nhưng không có giá trị
    if (
      data.onlyAdminsCanSend &&
      data.restrictionType === 'until' &&
      data.restrictionDuration === 'custom' &&
      (!data.customMinutes || data.customMinutes <= 0)
    ) {
      messageRestrictionForm.setError('customMinutes', {
        type: 'manual',
        message: 'Vui lòng nhập thời gian hợp lệ (lớn hơn 0)'
      })
      return
    }

    setIsUpdatingRestriction(true)
    try {
      // Tính toán duration dựa trên lựa chọn của người dùng
      let duration = 0

      // Chỉ tính duration khi chế độ được bật và có thời hạn
      if (data.onlyAdminsCanSend && data.restrictionType === 'until') {
        if (data.restrictionDuration === '30') {
          duration = 30 // 30 phút
        } else if (data.restrictionDuration === '60') {
          duration = 60 // 1 giờ
        } else if (data.restrictionDuration === '180') {
          duration = 180 // 3 giờ
        } else if (data.restrictionDuration === '1440') {
          duration = 1440 // 1 ngày (24 giờ)
        } else if (data.restrictionDuration === 'custom' && data.customMinutes) {
          duration = data.customMinutes // Số phút tùy chỉnh
        }
      }

      // Gọi API thông qua mutation hook
      await updateRestrictionMutation.mutateAsync({
        conversationId: conversation._id,
        onlyAdminsCanSend: data.onlyAdminsCanSend,
        duration
      })

      toast.success(messagesT('settingsUpdatedSuccess'))
      onUpdate?.()
    } catch (error) {
      toast.error(messagesT('settingsUpdateError', { error: (error as Error).message }))
    } finally {
      setIsUpdatingRestriction(false)
    }
  }

  // Thêm hàm helper để tính thời gian kết thúc dựa trên loại và thời lượng
  const getRestrictionEndDate = () => {
    if (restrictionType !== 'until') return null

    const now = new Date()
    switch (restrictionDuration) {
      case '30':
        return addMinutes(now, 30)
      case '60':
        return addHours(now, 1)
      case '180':
        return addHours(now, 3)
      case '1440':
        return addDays(now, 1)
      case 'custom':
        return customMinutes ? addMinutes(now, customMinutes) : null
      default:
        return null
    }
  }

  // Thêm useEffect để tự động bật yêu cầu phê duyệt khi chọn nhóm riêng tư
  useEffect(() => {
    const currentGroupType = groupSettingsForm.watch('groupType')

    // Nếu chọn nhóm riêng tư, tự động bật yêu cầu phê duyệt
    if (currentGroupType === GROUP_TYPE.PRIVATE) {
      groupSettingsForm.setValue('requireApproval', true)
    }
  }, [groupSettingsForm.watch('groupType')])

  // Thêm useEffect để kiểm tra và tự động tắt toggle khi hết hiệu lực
  useEffect(() => {
    // Kiểm tra nếu đang bật chế độ chỉ admin gửi tin nhắn và có thời hạn
    if (conversation?.onlyAdminsCanSend && conversation?.restrictUntil) {
      const restrictUntil = new Date(conversation.restrictUntil)
      const now = new Date()

      // Nếu đã hết thời hạn
      if (restrictUntil <= now) {
        // Tự động tắt toggle trong form
        setValue('onlyAdminsCanSend', false)

        // Chỉ hiển thị thông báo cho admin/owner
        if (isAdmin) {
          toast.info(messagesT('adminOnlyModeExpired'))
        }
      }
    }
  }, [conversation, setValue, isAdmin, messagesT])

  // Hàm chụp ảnh mã QR sử dụng Canvas API
  const handleCaptureQRCode = () => {
    if (!qrCodeRef.current) return

    try {
      // Lấy SVG element
      const svgElement = qrCodeRef.current.querySelector('svg')
      if (!svgElement) {
        toast.error(messagesT('qrCodeNotFound'))
        return
      }

      // Tạo một canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error(messagesT('browserNotSupportCanvas'))
        return
      }

      // Đặt kích thước canvas
      const size = 1000 // Kích thước lớn cho chất lượng cao
      canvas.width = size
      canvas.height = size

      // Vẽ nền trắng
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, size, size)

      // Thêm hiệu ứng đổ bóng nhẹ
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 4

      // Vẽ một hình chữ nhật trắng làm nền cho QR
      ctx.fillStyle = 'white'
      ctx.fillRect(50, 50, size - 100, size - 100)

      // Tắt đổ bóng cho QR code
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Chuyển SVG thành data URL
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svgBlob)

      // Tạo image từ SVG
      const img = new Image()
      img.onload = () => {
        // Vẽ SVG lên canvas
        const padding = 100 // Padding xung quanh QR
        ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2)

        // Thêm tên nhóm và thông tin
        ctx.font = 'bold 40px Arial'
        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.fillText(conversation?.name || 'Nhóm chat', size / 2, size - 60)

        ctx.font = '30px Arial'
        ctx.fillStyle = '#666'
        ctx.fillText('Quét mã để tham gia', size / 2, size - 20)

        // Chuyển canvas thành data URL
        const dataUrl = canvas.toDataURL('image/png')

        // Tạo link tải xuống
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `invite-${conversation?.name || 'group'}-qr.png`
        document.body.appendChild(link)
        link.click()

        // Dọn dẹp
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(messagesT('qrCodeSaved'))
      }

      img.src = url
    } catch (error) {
      console.error('Lỗi khi chụp ảnh QR:', error)
      toast.error(messagesT('errorSavingImage'))
    }
  }

  const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useFileUpload({
    onSuccess: (data) => {
      if (data?.urls && data.urls.length > 0) {
        groupSettingsForm.setValue('avatar', data.urls[0], {
          shouldDirty: true,
          shouldTouch: true
        })
        toast.success(messagesT('avatarUploaded'))
      }
    },
    onError: (error) => {
      toast.error(messagesT('avatarUploadError', { error: error.message }))
    }
  })

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatar([file])
    }
  }

  // Thêm hàm xử lý xóa avatar
  const handleRemoveAvatar = () => {
    groupSettingsForm.setValue('avatar', '', {
      shouldDirty: true,
      shouldTouch: true
    })
    toast.success(messagesT('avatarRemoved'))
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Settings className='h-5 w-5' />
                <span className='sr-only'>{messagesT('groupSettings')}</span>
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>{messagesT('groupSettings')}</TooltipContent>
        </Tooltip>

        <SheetContent side='right' className='max-h-screen w-full overflow-y-auto px-4 py-6'>
          <SheetHeader className='px-0 pt-2'>
            <SheetTitle>{messagesT('groupSettings')}</SheetTitle>
            <SheetDescription>
              {messagesT('groupMembersCount', { 
                count: conversation?.participants?.length || 0, 
                max: MAX_GROUP_MEMBERS 
              })}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue='general' value={activeTab} onValueChange={setActiveTab} className='mt-4 w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='general'>{messagesT('general')}</TabsTrigger>
              <TabsTrigger value='members'>{messagesT('members')}</TabsTrigger>
              <TabsTrigger value='invite'>{messagesT('invite')}</TabsTrigger>
            </TabsList>

            <TabsContent value='general' className='mt-4'>
              <ScrollArea className='-mr-2 max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto py-2 pr-2'>
                {/* Hiển thị thông tin nhóm chỉ cho thành viên thường */}
                {!isAdmin && (
                  <div className='mb-4 space-y-3'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium'>{messagesT('groupType')}:</span>
                      {conversation?.groupType === GROUP_TYPE.PRIVATE ? (
                        <Badge variant='outline' className='border-blue-500/20 bg-blue-500/10 text-blue-500'>
                          {messagesT('privateGroup')}
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='border-green-500/20 bg-green-500/10 text-green-500'>
                          {messagesT('publicGroup')}
                        </Badge>
                      )}
                    </div>

                    {conversation?.requireApproval && (
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>{messagesT('joining')}:</span>
                        <Badge variant='outline' className='border-orange-500/20 bg-orange-500/10 text-orange-500'>
                          {messagesT('requireApproval')}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Form cài đặt nhóm chỉ hiển thị cho admin */}
                {isAdmin && (
                  <Form {...groupSettingsForm}>
                    <form onSubmit={groupSettingsForm.handleSubmit(onSubmitGroupSettings)} className='space-y-6'>
                      <FormField
                        control={groupSettingsForm.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{messagesT('groupName')}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!canChangeGroupInfo} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={groupSettingsForm.control}
                        name='avatar'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{messagesT('groupAvatar')}</FormLabel>
                            <div className='flex items-center gap-2'>
                              <FormControl>
                                <Input
                                  placeholder={messagesT('avatarUrlPlaceholder')}
                                  {...field}
                                  value={field.value || ''}
                                  disabled={isUploadingAvatar || !canChangeGroupInfo}
                                />
                              </FormControl>
                              <div className='relative'>
                                {field.value ? (
                                  <Button
                                    type='button'
                                    variant='destructive'
                                    size='icon'
                                    onClick={handleRemoveAvatar}
                                    disabled={isUploadingAvatar || !canChangeGroupInfo}
                                    aria-label={messagesT('removeAvatar')}
                                    className='h-10 w-10 overflow-hidden p-0'
                                  >
                                    <Trash className='h-4 w-4' />
                                    <span className='sr-only'>{messagesT('removeAvatar')}</span>
                                  </Button>
                                ) : (
                                  <>
                                    <Input
                                      type='file'
                                      id='avatar-upload'
                                      className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                                      accept='image/*'
                                      onChange={handleAvatarUpload}
                                      disabled={isUploadingAvatar || !canChangeGroupInfo}
                                      multiple={false}
                                      aria-label={messagesT('uploadAvatar')}
                                    />
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='icon'
                                      disabled={isUploadingAvatar || !canChangeGroupInfo}
                                      aria-hidden='true'
                                      tabIndex={-1}
                                      className='h-10 w-10 overflow-hidden p-0'
                                    >
                                      {isUploadingAvatar ? (
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                      ) : (
                                        <Upload className='h-4 w-4' />
                                      )}
                                      <span className='sr-only'>{messagesT('uploadAvatar')}</span>
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {field.value && (
                              <div className='mt-2 flex justify-center'>
                                <Avatar className='h-16 w-16'>
                                  <AvatarImage src={field.value} alt='Group avatar preview' />
                                  <AvatarFallback>
                                    {groupSettingsForm.getValues('name')?.charAt(0) || 'G'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={groupSettingsForm.control}
                        name='groupType'
                        render={({ field }) => (
                          <FormItem className='space-y-2'>
                            <FormLabel>{messagesT('groupType')}</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className='flex flex-col space-y-1'
                                disabled={!canChangeGroupInfo}
                              >
                                <FormItem className='flex items-start space-y-0 space-x-3'>
                                  <FormControl>
                                    <RadioGroupItem value={GROUP_TYPE.PUBLIC} disabled={!canChangeGroupInfo} />
                                  </FormControl>
                                  <div>
                                    <FormLabel className='font-normal'>{messagesT('public')}</FormLabel>
                                    <FormDescription className='text-xs'>
                                      {messagesT('publicGroupDescription')}
                                    </FormDescription>
                                  </div>
                                </FormItem>
                                <FormItem className='flex items-start space-y-0 space-x-3'>
                                  <FormControl>
                                    <RadioGroupItem value={GROUP_TYPE.PRIVATE} disabled={!canChangeGroupInfo} />
                                  </FormControl>
                                  <div>
                                    <FormLabel className='font-normal'>{messagesT('private')}</FormLabel>
                                    <FormDescription className='text-xs'>
                                      {messagesT('privateGroupDescription')}
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={groupSettingsForm.control}
                        name='requireApproval'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('requireApprovalToJoin')}</FormLabel>
                              <FormDescription>
                                {groupSettingsForm.watch('groupType') === GROUP_TYPE.PRIVATE
                                  ? messagesT('privateGroupAlwaysRequiresApproval')
                                  : field.value
                                    ? messagesT('usersNeedApproval')
                                    : messagesT('usersCanJoinImmediately')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={
                                  groupSettingsForm.watch('groupType') === GROUP_TYPE.PRIVATE || !canChangeGroupInfo
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type='submit'
                        disabled={
                          updateGroupMutation.isPending ||
                          !groupSettingsForm.formState.isDirty ||
                          (!canChangeGroupInfo && onlyAdminsCanSend === conversation?.onlyAdminsCanSend)
                          // Chỉ kiểm tra canChangeGroupInfo khi không có thay đổi về chế độ onlyAdminsCanSend
                        }
                        className='w-full'
                      >
                        {updateGroupMutation.isPending ? messagesT('updating') : messagesT('saveChanges')}
                      </Button>
                    </form>
                  </Form>
                )}
                <Separator className='my-4' />
                {isOwner && (
                  <div className='mt-6 space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex flex-col space-y-1.5'>
                        <h3 className='text-sm font-medium'>{messagesT('messageSettings')}</h3>
                        <p className='text-muted-foreground text-xs'>{messagesT('messageSettingsDescription')}</p>
                      </div>
                      {/* Thêm nút lưu dạng icon bên cạnh tiêu đề với tooltip */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={messageRestrictionForm.handleSubmit(handleUpdateRestriction)}
                            disabled={isUpdatingRestriction}
                            size='icon'
                            variant='default'
                            className='h-8 w-8'
                          >
                            {isUpdatingRestriction ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                className='h-4 w-4'
                              >
                                <path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'></path>
                                <polyline points='17 21 17 13 7 13 7 21'></polyline>
                                <polyline points='7 3 7 8 15 8'></polyline>
                              </svg>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{messagesT('saveMessageSettings')}</TooltipContent>
                      </Tooltip>
                    </div>

                    <Form {...messageRestrictionForm}>
                      <form onSubmit={messageRestrictionForm.handleSubmit(handleUpdateRestriction)}>
                        <FormField
                          control={messageRestrictionForm.control}
                          name='onlyAdminsCanSend'
                          render={({ field }) => (
                            <FormItem className='flex items-center justify-between gap-2 rounded-lg border p-4'>
                              <div className='space-y-0.5'>
                                <FormLabel htmlFor='admin-only-messages'>{messagesT('onlyAdminsCanSend')}</FormLabel>
                                <FormDescription className='text-xs'>
                                  {messagesT('onlyAdminsCanSendDescription')}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  id='admin-only-messages'
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isUpdatingRestriction || !isOwner}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {/* Hiển thị thời gian còn lại nếu đang có giới hạn */}
                        {conversation?.onlyAdminsCanSend &&
                          conversation?.restrictUntil &&
                          new Date(conversation.restrictUntil) > new Date() && (
                            <div
                              className='mt-2 rounded-sm border-l-4 border-yellow-500/70 py-1.5 pl-3 text-xs text-yellow-500 dark:border-yellow-400/70 dark:text-yellow-400'
                              style={{
                                background: 'linear-gradient(90deg, rgba(234,179,8,0.08) 0%, rgba(234,179,8,0.02) 100%)'
                              }}
                            >
                              <div className='mb-0.5 flex items-center gap-1.5'>
                                <Clock className='h-3.5 w-3.5' />
                                <p className='font-medium'>
                                  {messagesT('remainingTime')}:{' '}
                                  {formatDistanceToNow(new Date(conversation.restrictUntil), {
                                    addSuffix: false,
                                    locale: vi
                                  })}
                                </p>
                              </div>
                              <p className='pl-5 text-yellow-500/80 dark:text-yellow-400/80'>
                                {messagesT('endTime')}:{' '}
                                {format(new Date(conversation.restrictUntil), 'dd/MM/yyyy HH:mm', { locale: vi })}
                              </p>
                            </div>
                          )}

                        {/* Hiển thị các tùy chọn khi bật chế độ chỉ admin gửi tin nhắn */}
                        {onlyAdminsCanSend && (
                          <div className='border-primary/20 bg-muted/30 mt-2 space-y-4 rounded-md border-l-2 px-4 py-2'>
                            {/* Loại giới hạn */}
                            <FormField
                              control={messageRestrictionForm.control}
                              name='restrictionType'
                              render={({ field }) => (
                                <FormItem className='space-y-2'>
                                  <FormLabel>{messagesT('restrictionType')}</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      className='space-y-1'
                                    >
                                      <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='indefinite' id='r-indefinite' />
                                        <Label htmlFor='r-indefinite' className='text-sm font-normal'>
                                          {messagesT('indefinite')}
                                        </Label>
                                      </div>
                                      <div className='flex items-center space-x-2'>
                                        <RadioGroupItem value='until' id='r-until' />
                                        <Label htmlFor='r-until' className='text-sm font-normal'>
                                          {messagesT('until')}
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {/* Thời gian cụ thể */}
                            {restrictionType === 'until' && (
                              <FormField
                                control={messageRestrictionForm.control}
                                name='restrictionDuration'
                                render={({ field }) => (
                                  <FormItem className='space-y-2'>
                                    <FormLabel>{messagesT('restrictionDuration')}</FormLabel>
                                    <FormControl>
                                      <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className='space-y-1'
                                      >
                                        <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value='30' id='d-30' />
                                          <Label htmlFor='d-30' className='text-sm font-normal'>
                                            {messagesT('30Minutes')}
                                          </Label>
                                        </div>
                                        <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value='60' id='d-60' />
                                          <Label htmlFor='d-60' className='text-sm font-normal'>
                                            {messagesT('1Hour')}
                                          </Label>
                                        </div>
                                        <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value='180' id='d-180' />
                                          <Label htmlFor='d-180' className='text-sm font-normal'>
                                            {messagesT('3Hours')}
                                          </Label>
                                        </div>
                                        <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value='1440' id='d-1440' />
                                          <Label htmlFor='d-1440' className='text-sm font-normal'>
                                            {messagesT('1Day')}
                                          </Label>
                                        </div>
                                        <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value='custom' id='d-custom' />
                                          <Label htmlFor='d-custom' className='text-sm font-normal'>
                                            {messagesT('custom')}
                                          </Label>
                                        </div>
                                      </RadioGroup>
                                    </FormControl>
                                    {field.value !== 'custom' && (
                                      <p className='text-muted-foreground text-xs'>
                                        {messagesT('endTime')}:{' '}
                                        {format(getRestrictionEndDate() || new Date(), 'dd/MM/yyyy HH:mm', {
                                          locale: vi
                                        })}
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            {/* Thời gian tùy chỉnh */}
                            {restrictionType === 'until' && restrictionDuration === 'custom' && (
                              <FormField
                                control={messageRestrictionForm.control}
                                name='customMinutes'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{messagesT('customMinutes')}</FormLabel>
                                    <FormControl>
                                      <div className='flex items-center gap-2'>
                                        <Input
                                          type='number'
                                          min={1}
                                          max={10080}
                                          {...field}
                                          value={field.value || ''}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            // Chỉ cho phép số nguyên dương
                                            if (value === '' || /^\d+$/.test(value)) {
                                              const numValue = value === '' ? undefined : parseInt(value, 10)
                                              field.onChange(numValue)
                                            }
                                          }}
                                          className='w-20'
                                        />
                                        <Label className='text-xs'>{messagesT('minutes')}</Label>
                                      </div>
                                    </FormControl>
                                    <FormDescription>{messagesT('max10080Minutes')}</FormDescription>
                                    <FormMessage />
                                    <p className='text-muted-foreground mt-1 text-xs'>
                                      {messagesT('endTime')}:{' '}
                                      {field.value && field.value > 0
                                        ? format(addMinutes(new Date(), field.value), 'dd/MM/yyyy HH:mm', {
                                            locale: vi
                                          })
                                        : ''}
                                    </p>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        )}
                      </form>
                    </Form>
                  </div>
                )}

                {!canChangeGroupInfo && (
                  <p className='text-muted-foreground mt-2 text-sm'>{messagesT('noPermissionToChangeGroupInfo')}</p>
                )}

                {isOwner && (
                  <>
                    <Separator className='my-4' />
                    <div className='space-y-2'>
                      <h3 className='text-sm font-medium'>{messagesT('disbandGroup')}</h3>
                      <p className='text-muted-foreground text-sm'>
                        {messagesT('disbandGroupWarning')}
                      </p>
                      <Button
                        variant='destructive'
                        onClick={handleDisbandGroup}
                        disabled={disbandGroupMutation.isPending}
                        className='w-full'
                      >
                        <Trash className='mr-2 h-4 w-4' />
                        {disbandGroupMutation.isPending ? messagesT('processing') : messagesT('disbandGroup')}
                      </Button>
                    </div>
                  </>
                )}

                <Separator className='my-4' />

                <div className='space-y-2'>
                  <h3 className='text-sm font-medium'>{messagesT('leaveGroup')}</h3>
                  <p className='text-muted-foreground text-sm'>
                    {isOwner
                      ? messagesT('ownerLeaveGroupMessage')
                      : messagesT('memberLeaveGroupMessage')}
                  </p>
                  <Button
                    variant='destructive'
                    onClick={handleLeaveGroup}
                    disabled={leaveGroupMutation.isPending}
                    className='w-full'
                  >
                    <LogOut className='mr-2 h-4 w-4' />
                    {leaveGroupMutation.isPending ? messagesT('processing') : messagesT('leaveGroup')}
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value='members' className='mt-4'>
              <div className='mb-4 flex items-center space-x-2'>
                <Input
                  placeholder={messagesT('searchMembers')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='h-9'
                />
              </div>

              <ScrollArea className='h-[400px] pr-4'>
                {isLoadingMembers ? (
                  <div className='flex justify-center p-4'>{messagesT('loading')}</div>
                ) : filteredMembers.length === 0 ? (
                  <div className='text-muted-foreground p-4 text-center'>
                    {searchQuery ? messagesT('noMembersFound') : messagesT('noMembers')}
                  </div>
                ) : (
                  filteredMembers.map((member: any) => (
                    <div
                      key={member._id}
                      className='hover:bg-accent flex items-center justify-between rounded-md px-1 py-3'
                    >
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className='flex items-center gap-1 font-medium'>
                            {member.name}
                            {member._id === currentUserId && (
                              <span className='text-muted-foreground ml-1 text-xs'>({messagesT('you')})</span>
                            )}
                            {member.customTitle && (
                              <span className='ml-1 text-xs text-blue-500'>- {member.customTitle}</span>
                            )}
                          </p>
                          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                            {getRoleIcon(member.role)}
                            <span>{getRoleName(member.role)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Nút quản lý thành viên - chỉ hiển thị cho admin/owner */}
                      {isAdmin && member._id !== currentUserId && (
                        <div className='flex items-center gap-1'>
                          {/* Ẩn tất cả các nút quản lý khi:
                              1. Người dùng hiện tại là admin và thành viên cần quản lý là chủ nhóm, hoặc
                              2. Người dùng hiện tại là admin và thành viên cần quản lý cũng là admin */}
                          {(isOwner || (member.role !== MEMBER_ROLE.OWNER && member.role !== MEMBER_ROLE.ADMIN)) && (
                            <>
                              {/* Chỉ hiển thị nút chỉnh sửa quyền khi có quyền addNewAdmins hoặc là chủ nhóm */}
                              {(isOwner || currentMember?.permissions?.addNewAdmins) && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleEditMember(member)}
                                  className='h-8 px-2'
                                >
                                  <UserCog className='mr-1 h-4 w-4' />
                                </Button>
                              )}

                              {/* Chỉ hiển thị nút xóa thành viên khi có quyền banUsers hoặc là chủ nhóm */}
                              {(isOwner || currentMember?.permissions?.banUsers) && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleRemoveUser(member)}
                                  className='text-destructive h-8 px-2'
                                >
                                  <UserMinus className='mr-1 h-4 w-4' />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value='invite' className='mt-4'>
              <div className='space-y-6'>
                <div className='space-y-2'>
                  <Label>{messagesT('inviteLink')}</Label>
                  <div className='flex items-center space-x-2'>
                    <Input value={`${window.location.origin}/group/join/${inviteLink}`} readOnly />
                    <Button variant='outline' size='icon' onClick={handleCopyInviteLink}>
                      <Copy className='h-4 w-4' />
                    </Button>
                  </div>
                  <p className='text-muted-foreground text-sm'>{messagesT('inviteLinkDescription')}</p>
                </div>

                {/* Phần mã QR */}
                <div className='space-y-2'>
                  <Label className='flex items-center gap-1'>
                    <QrCode className='h-4 w-4' />
                    {messagesT('qrCode')}
                  </Label>
                  <div className='flex flex-col items-center'>
                    <div
                      ref={qrCodeRef}
                      className='mt-5 mb-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm'
                      style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
                    >
                      <QRCodeSVG
                        value={`${window.location.origin}/group/join/${inviteLink}`}
                        size={200}
                        level='H'
                        includeMargin={true}
                        imageSettings={{
                          src: conversation?.avatar || '/logo.png',
                          height: 30,
                          width: 30,
                          excavate: true
                        }}
                      />
                    </div>
                    <div className='mt-3 flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleCaptureQRCode}
                        className='flex items-center gap-1'
                      >
                        <Camera className='h-4 w-4' />
                        {messagesT('saveQrCode')}
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleCopyInviteLink}
                        className='flex items-center gap-1'
                      >
                        <Copy className='h-4 w-4' />
                        {messagesT('copyLink')}
                      </Button>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={handleGenerateNewLink}
                    disabled={generateInviteLinkMutation.isPending}
                  >
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {generateInviteLinkMutation.isPending ? messagesT('generatingNewLink') : messagesT('generateNewLink')}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dialog xác nhận xóa thành viên */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messagesT('removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>{messagesT('confirmRemoveMember', { name: memberToRemove?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messagesT('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveUser}>{messagesT('remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog chỉnh sửa thành viên */}
      <AlertDialog open={memberEditDialogOpen} onOpenChange={setMemberEditDialogOpen}>
        <AlertDialogContent className='max-h-[90vh] max-w-md overflow-y-auto'>
          <AlertDialogHeader>
            <AlertDialogTitle>{messagesT('editMember')}</AlertDialogTitle>
            <AlertDialogDescription>{messagesT('updateMemberRoleAndPermissions', { name: memberToEdit?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...memberEditForm}>
            <form onSubmit={memberEditForm.handleSubmit(onSubmitMemberEdit)} className='space-y-4 py-4'>
              <FormField
                control={memberEditForm.control}
                name='role'
                render={({ field }) => (
                  <FormItem className='space-y-2'>
                    <FormLabel>{messagesT('role')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-col space-y-1'
                      >
                        <FormItem className='flex items-center space-y-0 space-x-3'>
                          <FormControl>
                            <RadioGroupItem value={MEMBER_ROLE.ADMIN} />
                          </FormControl>
                          <FormLabel className='font-normal'>{messagesT('admin')}</FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-y-0 space-x-3'>
                          <FormControl>
                            <RadioGroupItem value={MEMBER_ROLE.MEMBER} />
                          </FormControl>
                          <FormLabel className='font-normal'>{messagesT('member')}</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={memberEditForm.control}
                name='customTitle'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{messagesT('customTitle')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder={messagesT('titleExample')} />
                    </FormControl>
                    <FormDescription>{messagesT('titleDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {memberEditForm.watch('role') === MEMBER_ROLE.ADMIN && (
                <div className='space-y-3'>
                  <FormLabel>{messagesT('permissions')}</FormLabel>

                  <ScrollArea className='h-[250px] rounded-md border'>
                    <div className='space-y-3 p-4'>
                      <FormField
                        control={memberEditForm.control}
                        name='permissions.changeGroupInfo'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('changeGroupInfo')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberEditForm.control}
                        name='permissions.deleteMessages'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('deleteMessages')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberEditForm.control}
                        name='permissions.inviteUsers'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('inviteUsers')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberEditForm.control}
                        name='permissions.pinMessages'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('pinMessages')}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Quyền addNewAdmins - vô hiệu hóa nếu người dùng hiện tại là admin */}
                      <FormField
                        control={memberEditForm.control}
                        name='permissions.addNewAdmins'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('addNewAdmins')}</FormLabel>
                              {!isOwner && (
                                <FormDescription className='text-xs'>
                                  {messagesT('onlyOwnerCanGrant')}
                                </FormDescription>
                              )}
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!isOwner} // Chỉ owner mới có thể cấp quyền này
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Quyền banUsers - vô hiệu hóa nếu người dùng hiện tại là admin */}
                      <FormField
                        control={memberEditForm.control}
                        name='permissions.banUsers'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('banUsers')}</FormLabel>
                              {!isOwner && (
                                <FormDescription className='text-xs'>
                                  {messagesT('onlyOwnerCanGrant')}
                                </FormDescription>
                              )}
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!isOwner} // Chỉ owner mới có thể cấp quyền này
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Quyền approveJoinRequests - vô hiệu hóa nếu người dùng hiện tại là admin */}
                      <FormField
                        control={memberEditForm.control}
                        name='permissions.approveJoinRequests'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>{messagesT('approveJoinRequests')}</FormLabel>
                              {!isOwner && (
                                <FormDescription className='text-xs'>
                                  {messagesT('onlyOwnerCanGrant')}
                                </FormDescription>
                              )}
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!isOwner} // Chỉ owner mới có thể cấp quyền này
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </ScrollArea>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel type='button'>{messagesT('cancel')}</AlertDialogCancel>
                <AlertDialogAction type='submit'>{messagesT('saveChanges')}</AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog xác nhận tạo link mới */}
      <AlertDialog open={confirmNewLinkDialogOpen} onOpenChange={setConfirmNewLinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messagesT('generateNewLink')}</AlertDialogTitle>
            <AlertDialogDescription>
              {messagesT('generateNewLinkWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messagesT('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerateNewLink}>{messagesT('generate')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog xác nhận rời nhóm (cho thành viên không phải chủ nhóm) */}
      <AlertDialog open={leaveGroupConfirmOpen} onOpenChange={setLeaveGroupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messagesT('leaveGroup')}</AlertDialogTitle>
            <AlertDialogDescription>
              {messagesT('confirmLeaveGroup')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messagesT('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeaveGroup}>{messagesT('leaveGroup')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog chuyển quyền chủ nhóm */}
      <TransferOwnershipDialog
        open={transferOwnershipDialogOpen}
        onOpenChange={setTransferOwnershipDialogOpen}
        conversation={conversation}
        onComplete={handleTransferOwnershipComplete}
      />

      {/* Dialog xác nhận giải tán nhóm */}
      <AlertDialog open={disbandGroupConfirmOpen} onOpenChange={setDisbandGroupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messagesT('disbandGroup')}</AlertDialogTitle>
            <AlertDialogDescription>
              {messagesT('confirmDisbandGroup')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messagesT('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisbandGroup}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {messagesT('disbandGroup')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
