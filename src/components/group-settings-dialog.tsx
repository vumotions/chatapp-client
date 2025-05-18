import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Crown, LogOut, RefreshCw, Scroll, Settings, Shield, Trash, UserCog, UserMinus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
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
import { MAX_GROUP_MEMBERS } from '~/constants/app.constants'
import { GROUP_TYPE, MEMBER_ROLE } from '~/constants/enums'
import { useFriendsWithRolesQuery } from '~/hooks/data/friends.hook'
import {
  useDisbandGroupMutation,
  useGenerateInviteLinkMutation,
  useLeaveGroupMutation,
  useRemoveGroupMemberMutation,
  useUpdateGroupMutation,
  useUpdateMemberRoleMutation
} from '~/hooks/data/group-chat.hooks'
import { TransferOwnershipDialog } from './transfer-ownership-dialog'
import { Badge } from './ui/badge'

// Zod schema cho form cài đặt nhóm
const groupSettingsSchema = z.object({
  name: z.string().min(1, 'Tên nhóm không được để trống').max(50, 'Tên nhóm không quá 50 ký tự'),
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

type GroupSettingsValues = z.infer<typeof groupSettingsSchema>
type MemberEditValues = z.infer<typeof memberEditSchema>

export function GroupSettingsDialog({ conversation, onUpdate }: { conversation: any; onUpdate?: () => void }) {
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

  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  // Kiểm tra quyền
  const isOwner = conversation?.userId?.toString() === currentUserId?.toString()
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

  // Mutations
  const updateGroupMutation = useUpdateGroupMutation(conversation?._id, onUpdate)
  const generateInviteLinkMutation = useGenerateInviteLinkMutation(conversation?._id, (link) => setInviteLink(link))
  const leaveGroupMutation = useLeaveGroupMutation(conversation?._id)
  const removeUserMutation = useRemoveGroupMemberMutation(conversation?._id)
  const updateMemberRoleMutation = useUpdateMemberRoleMutation(conversation?._id)
  const disbandGroupMutation = useDisbandGroupMutation(conversation?._id)

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
    const permissions = data.permissions || {
      changeGroupInfo: false,
      deleteMessages: false,
      banUsers: false,
      inviteUsers: true,
      pinMessages: false,
      addNewAdmins: false,
      approveJoinRequests: false
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

    console.log('Editing member (prepared):', preparedMember)
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
        return 'Chủ nhóm'
      case MEMBER_ROLE.ADMIN:
        return 'Quản trị viên'
      case MEMBER_ROLE.MEMBER:
        return 'Thành viên'
      default:
        return 'Thành viên'
    }
  }

  const handleDisbandGroup = () => {
    setDisbandGroupConfirmOpen(true)
  }

  const confirmDisbandGroup = () => {
    disbandGroupMutation.mutate()
    setDisbandGroupConfirmOpen(false)
  }

  // Thêm useEffect để tự động bật yêu cầu phê duyệt khi chọn nhóm riêng tư
  useEffect(() => {
    const currentGroupType = groupSettingsForm.watch('groupType')

    // Nếu chọn nhóm riêng tư, tự động bật yêu cầu phê duyệt
    if (currentGroupType === GROUP_TYPE.PRIVATE) {
      groupSettingsForm.setValue('requireApproval', true)
    }
  }, [groupSettingsForm.watch('groupType')])

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Settings className='h-5 w-5' />
                <span className='sr-only'>Cài đặt nhóm</span>
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>Cài đặt nhóm</TooltipContent>
        </Tooltip>

        <SheetContent side='right' className='max-h-screen w-full overflow-y-auto px-4 py-6'>
          <SheetHeader className='px-0 pt-2'>
            <SheetTitle>Cài đặt nhóm</SheetTitle>
            <SheetDescription>
              Nhóm có {conversation?.participants?.length || 0} thành viên (tối đa {MAX_GROUP_MEMBERS})
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue='general' value={activeTab} onValueChange={setActiveTab} className='mt-4 w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='general'>Chung</TabsTrigger>
              <TabsTrigger value='members'>Thành viên</TabsTrigger>
              <TabsTrigger value='invite'>Mời</TabsTrigger>
            </TabsList>

            <TabsContent value='general' className='mt-4'>
              <ScrollArea className='-mr-2 max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto py-2 pr-2'>
                {/* Hiển thị thông tin nhóm chỉ cho thành viên thường */}
                {!isAdmin && (
                  <div className='mb-4 space-y-3'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium'>Loại nhóm:</span>
                      {conversation?.groupType === GROUP_TYPE.PRIVATE ? (
                        <Badge variant='outline' className='border-blue-500/20 bg-blue-500/10 text-blue-500'>
                          Nhóm riêng tư
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='border-green-500/20 bg-green-500/10 text-green-500'>
                          Nhóm công khai
                        </Badge>
                      )}
                    </div>

                    {conversation?.requireApproval && (
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>Tham gia:</span>
                        <Badge variant='outline' className='border-orange-500/20 bg-orange-500/10 text-orange-500'>
                          Yêu cầu phê duyệt
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
                            <FormLabel>Tên nhóm</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!canChangeGroupInfo} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={groupSettingsForm.control}
                        name='groupType'
                        render={({ field }) => (
                          <FormItem className='space-y-2'>
                            <FormLabel>Loại nhóm</FormLabel>
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
                                    <FormLabel className='font-normal'>Công khai</FormLabel>
                                    <FormDescription className='text-xs'>
                                      Nhóm có thể được tìm thấy trong tìm kiếm. Bạn có thể chọn yêu cầu phê duyệt hoặc
                                      cho phép tham gia tự do.
                                    </FormDescription>
                                  </div>
                                </FormItem>
                                <FormItem className='flex items-start space-y-0 space-x-3'>
                                  <FormControl>
                                    <RadioGroupItem value={GROUP_TYPE.PRIVATE} disabled={!canChangeGroupInfo} />
                                  </FormControl>
                                  <div>
                                    <FormLabel className='font-normal'>Riêng tư</FormLabel>
                                    <FormDescription className='text-xs'>
                                      Nhóm không hiển thị trong tìm kiếm. Chỉ những người được mời mới có thể thấy và
                                      yêu cầu tham gia. Luôn yêu cầu phê duyệt.
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
                              <FormLabel>Yêu cầu phê duyệt khi tham gia</FormLabel>
                              <FormDescription>
                                {groupSettingsForm.watch('groupType') === GROUP_TYPE.PRIVATE
                                  ? 'Nhóm riêng tư luôn yêu cầu phê duyệt khi tham gia'
                                  : field.value
                                    ? 'Người dùng cần được phê duyệt trước khi tham gia nhóm'
                                    : 'Người dùng có thể tham gia nhóm ngay lập tức qua link mời'}
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
                          updateGroupMutation.isPending || !groupSettingsForm.formState.isDirty || !canChangeGroupInfo
                        }
                        className='w-full'
                      >
                        {updateGroupMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                      </Button>
                    </form>
                  </Form>
                )}

                {!canChangeGroupInfo && (
                  <p className='text-muted-foreground mt-2 text-sm'>Bạn không có quyền thay đổi thông tin nhóm</p>
                )}

                {isOwner && (
                  <>
                    <Separator className='my-4' />
                    <div className='space-y-2'>
                      <h3 className='text-sm font-medium'>Giải tán nhóm</h3>
                      <p className='text-muted-foreground text-sm'>
                        Giải tán nhóm sẽ xóa vĩnh viễn nhóm và tất cả tin nhắn. Hành động này không thể hoàn tác.
                      </p>
                      <Button
                        variant='destructive'
                        onClick={handleDisbandGroup}
                        disabled={disbandGroupMutation.isPending}
                        className='w-full'
                      >
                        <Trash className='mr-2 h-4 w-4' />
                        {disbandGroupMutation.isPending ? 'Đang xử lý...' : 'Giải tán nhóm'}
                      </Button>
                    </div>
                  </>
                )}

                <Separator className='my-4' />

                <div className='space-y-2'>
                  <h3 className='text-sm font-medium'>Rời khỏi nhóm</h3>
                  <p className='text-muted-foreground text-sm'>
                    {isOwner
                      ? 'Bạn là chủ nhóm. Bạn cần chuyển quyền chủ nhóm trước khi rời nhóm.'
                      : 'Bạn sẽ không nhận được tin nhắn từ nhóm này nữa'}
                  </p>
                  <Button
                    variant='destructive'
                    onClick={handleLeaveGroup}
                    disabled={leaveGroupMutation.isPending}
                    className='w-full'
                  >
                    <LogOut className='mr-2 h-4 w-4' />
                    {leaveGroupMutation.isPending ? 'Đang xử lý...' : 'Rời khỏi nhóm'}
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value='members' className='mt-4'>
              <div className='mb-4 flex items-center space-x-2'>
                <Input
                  placeholder='Tìm kiếm thành viên...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='h-9'
                />
              </div>

              <ScrollArea className='h-[400px] pr-4'>
                {isLoadingMembers ? (
                  <div className='flex justify-center p-4'>Đang tải...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className='text-muted-foreground p-4 text-center'>
                    {searchQuery ? 'Không tìm thấy thành viên phù hợp' : 'Không có thành viên nào'}
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
                              <span className='text-muted-foreground ml-1 text-xs'>(Bạn)</span>
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
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditMember(member)}
                            className='h-8 px-2'
                          >
                            <UserCog className='mr-1 h-4 w-4' />
                          </Button>

                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemoveUser(member)}
                            className='text-destructive h-8 px-2'
                          >
                            <UserMinus className='mr-1 h-4 w-4' />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value='invite' className='mt-4'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Link mời tham gia nhóm</Label>
                  <div className='flex items-center space-x-2'>
                    <Input value={`${window.location.origin}/group/join/${inviteLink}`} readOnly />
                    <Button variant='outline' size='icon' onClick={handleCopyInviteLink}>
                      <Copy className='h-4 w-4' />
                    </Button>
                  </div>
                  <p className='text-muted-foreground text-sm'>Chia sẻ link này để mời người khác tham gia nhóm</p>
                </div>

                {isAdmin && (
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={handleGenerateNewLink}
                    disabled={generateInviteLinkMutation.isPending}
                  >
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {generateInviteLinkMutation.isPending ? 'Đang tạo...' : 'Tạo link mới'}
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
            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc chắn muốn xóa {memberToRemove?.name} khỏi nhóm?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveUser}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog chỉnh sửa thành viên */}
      <AlertDialog open={memberEditDialogOpen} onOpenChange={setMemberEditDialogOpen}>
        <AlertDialogContent className='max-h-[90vh] max-w-md overflow-y-auto'>
          <AlertDialogHeader>
            <AlertDialogTitle>Chỉnh sửa thành viên</AlertDialogTitle>
            <AlertDialogDescription>Cập nhật vai trò và quyền hạn cho {memberToEdit?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...memberEditForm}>
            <form onSubmit={memberEditForm.handleSubmit(onSubmitMemberEdit)} className='space-y-4 py-4'>
              <FormField
                control={memberEditForm.control}
                name='role'
                render={({ field }) => (
                  <FormItem className='space-y-2'>
                    <FormLabel>Vai trò</FormLabel>
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
                          <FormLabel className='font-normal'>Quản trị viên</FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-y-0 space-x-3'>
                          <FormControl>
                            <RadioGroupItem value={MEMBER_ROLE.MEMBER} />
                          </FormControl>
                          <FormLabel className='font-normal'>Thành viên</FormLabel>
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
                    <FormLabel>Tiêu đề tùy chỉnh</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder='Ví dụ: Trưởng nhóm, Thành viên mới...' />
                    </FormControl>
                    <FormDescription>Tiêu đề sẽ hiển thị bên cạnh tên thành viên</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {memberEditForm.watch('role') === MEMBER_ROLE.ADMIN && (
                <div className='space-y-3'>
                  <FormLabel>Quyền hạn</FormLabel>

                  <ScrollArea className='h-[250px] rounded-md border'>
                    <div className='space-y-3 p-4'>
                      <FormField
                        control={memberEditForm.control}
                        name='permissions.changeGroupInfo'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>Thay đổi thông tin nhóm</FormLabel>
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
                              <FormLabel>Xóa tin nhắn</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberEditForm.control}
                        name='permissions.banUsers'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>Cấm người dùng</FormLabel>
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
                              <FormLabel>Mời người dùng</FormLabel>
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
                              <FormLabel>Ghim tin nhắn</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberEditForm.control}
                        name='permissions.addNewAdmins'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>Thêm quản trị viên mới</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={memberEditForm.control}
                        name='permissions.approveJoinRequests'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                            <div className='space-y-0.5'>
                              <FormLabel>Phê duyệt yêu cầu tham gia</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </ScrollArea>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel type='button'>Hủy</AlertDialogCancel>
                <AlertDialogAction type='submit'>Lưu thay đổi</AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog xác nhận tạo link mới */}
      <AlertDialog open={confirmNewLinkDialogOpen} onOpenChange={setConfirmNewLinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tạo link mời mới</AlertDialogTitle>
            <AlertDialogDescription>
              Link mời cũ sẽ không còn hiệu lực. Bạn có chắc chắn muốn tạo link mới?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerateNewLink}>Tạo mới</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog xác nhận rời nhóm (cho thành viên không phải chủ nhóm) */}
      <AlertDialog open={leaveGroupConfirmOpen} onOpenChange={setLeaveGroupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời khỏi nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn rời khỏi nhóm này? Bạn sẽ không nhận được tin nhắn từ nhóm này nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeaveGroup}>Rời nhóm</AlertDialogAction>
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
            <AlertDialogTitle>Giải tán nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn giải tán nhóm này? Hành động này sẽ xóa vĩnh viễn nhóm và tất cả tin nhắn. Không thể
              hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisbandGroup}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Giải tán nhóm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
