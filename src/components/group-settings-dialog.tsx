import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Crown, RefreshCw, Settings, Shield, UserCog, UserMinus } from 'lucide-react'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '~/components/ui/dialog'

import { MAX_GROUP_MEMBERS } from '~/constants/app.constants'
import { GROUP_TYPE, MEMBER_ROLE } from '~/constants/enums'
import { useFriendsWithRolesQuery } from '~/hooks/data/friends.hook'
import {
  useGenerateInviteLinkMutation,
  useLeaveGroupMutation,
  useRemoveGroupMemberMutation,
  useUpdateGroupMutation,
  useUpdateMemberRoleMutation
} from '~/hooks/data/group-chat.hooks'

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

  const { data: session } = useSession()
  const currentUserId = session?.user?._id
  const isOwner = conversation?.userId?.toString() === currentUserId?.toString()
  const isAdmin = conversation?.members?.some(
    (m: any) =>
      m.userId?.toString() === currentUserId?.toString() &&
      (m.role === MEMBER_ROLE.ADMIN || m.role === MEMBER_ROLE.OWNER)
  )

  // Form cho cài đặt nhóm
  const groupSettingsForm = useForm<GroupSettingsValues>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: {
      name: conversation?.name || '',
      groupType: conversation?.groupType || GROUP_TYPE.PUBLIC,
      requireApproval: conversation?.requireApproval || false
    }
  })

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
  const { data: membersWithRoles = [], isLoading: isLoadingMembers } = useFriendsWithRolesQuery(
    open ? conversation?._id : undefined
  )

  // Lọc danh sách thành viên theo tìm kiếm
  const filteredMembers = membersWithRoles
    .filter((member: any) => member.inGroup)
    .filter((member: any) => member.name.toLowerCase().includes(searchQuery.toLowerCase()))

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

  const updateGroupMutation = useUpdateGroupMutation(conversation?._id, onUpdate)
  const generateInviteLinkMutation = useGenerateInviteLinkMutation(conversation?._id, (link) => setInviteLink(link))
  const leaveGroupMutation = useLeaveGroupMutation(conversation?._id)
  const removeUserMutation = useRemoveGroupMemberMutation(conversation?._id)
  const updateMemberRoleMutation = useUpdateMemberRoleMutation(conversation?._id)

  const onSubmitGroupSettings = (data: GroupSettingsValues) => {
    updateGroupMutation.mutate(data)
  }

  const onSubmitMemberEdit = (data: MemberEditValues) => {
    if (!memberToEdit) {
      console.error('No member to edit')
      return
    }

    console.log('Submitting member edit:', {
      conversationId: conversation._id,
      memberToEdit,
      formData: data
    })

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

    updateMemberRoleMutation.mutate({
      userId: memberToEdit._id,
      role: data.role,
      permissions: permissions,
      customTitle: data.customTitle
    })

    setMemberEditDialogOpen(false)
  }

  const handleLeaveGroup = () => {
    if (window.confirm('Bạn có chắc muốn rời khỏi nhóm này?')) {
      leaveGroupMutation.mutate()
    }
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
    setMemberToEdit(member)
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

  const renderConfirmNewLinkDialog = () => (
    <Dialog open={confirmNewLinkDialogOpen} onOpenChange={setConfirmNewLinkDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo link mời mới</DialogTitle>
          <DialogDescription>
            Tạo link mới sẽ làm vô hiệu link cũ. Bạn có chắc chắn muốn tiếp tục?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setConfirmNewLinkDialogOpen(false)}>
            Hủy
          </Button>
          <Button 
            onClick={confirmGenerateNewLink}
            disabled={generateInviteLinkMutation.isPending}
          >
            {generateInviteLinkMutation.isPending ? 'Đang tạo...' : 'Tạo link mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

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

        <SheetContent side='right' className='w-full px-4 py-6'>
          <SheetHeader className='p-0 pt-2'>
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
              <div className='flex-1 space-y-6 overflow-y-auto py-2'>
                {isAdmin ? (
                  <Form {...groupSettingsForm}>
                    <form onSubmit={groupSettingsForm.handleSubmit(onSubmitGroupSettings)} className='space-y-4'>
                      <FormField
                        control={groupSettingsForm.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tên nhóm</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              >
                                <FormItem className='flex items-center space-y-0 space-x-3'>
                                  <FormControl>
                                    <RadioGroupItem value={GROUP_TYPE.PUBLIC} />
                                  </FormControl>
                                  <FormLabel className='font-normal'>Công khai</FormLabel>
                                </FormItem>
                                <FormItem className='flex items-center space-y-0 space-x-3'>
                                  <FormControl>
                                    <RadioGroupItem value={GROUP_TYPE.PRIVATE} />
                                  </FormControl>
                                  <FormLabel className='font-normal'>Riêng tư</FormLabel>
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
                                {field.value
                                  ? 'Người dùng cần được phê duyệt trước khi tham gia nhóm'
                                  : 'Người dùng có thể tham gia nhóm ngay lập tức qua link mời'}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type='submit'
                        disabled={updateGroupMutation.isPending || !groupSettingsForm.formState.isDirty}
                        className='w-full'
                      >
                        {updateGroupMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <p className='text-muted-foreground'>Chỉ admin mới có thể thay đổi thông tin nhóm</p>
                )}

                <Separator className='my-4' />

                <div className='space-y-2'>
                  <h3 className='text-sm font-medium'>Rời khỏi nhóm</h3>
                  <p className='text-muted-foreground text-sm'>Bạn sẽ không nhận được tin nhắn từ nhóm này nữa</p>
                  <Button
                    variant='destructive'
                    onClick={handleLeaveGroup}
                    disabled={leaveGroupMutation.isPending}
                    className='w-full'
                  >
                    {leaveGroupMutation.isPending ? 'Đang xử lý...' : 'Rời khỏi nhóm'}
                  </Button>
                </div>
              </div>
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
                            Chỉnh sửa
                          </Button>

                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemoveUser(member)}
                            className='text-destructive h-8 px-2'
                          >
                            <UserMinus className='mr-1 h-4 w-4' />
                            Xóa
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
        <AlertDialogContent className='max-w-md'>
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
      {renderConfirmNewLinkDialog()}
    </>
  )
}


