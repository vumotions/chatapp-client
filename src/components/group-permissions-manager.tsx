'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, ChevronRight, Shield, ShieldAlert, ShieldCheck, User, UserX } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { Switch } from '~/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { MEMBER_ROLE } from '~/constants/enums'
import conversationsService from '~/services/conversations.service'

// Định nghĩa các quyền có thể cấp
const PERMISSIONS = [
  { id: 'changeGroupInfo', label: 'Thay đổi thông tin nhóm', description: 'Có thể đổi tên, ảnh đại diện nhóm' },
  { id: 'deleteMessages', label: 'Xóa tin nhắn', description: 'Có thể xóa tin nhắn của bất kỳ thành viên nào' },
  { id: 'banUsers', label: 'Cấm thành viên', description: 'Có thể xóa và cấm thành viên khỏi nhóm' },
  { id: 'inviteUsers', label: 'Mời thành viên', description: 'Có thể mời thành viên mới vào nhóm qua liên kết' },
  { id: 'pinMessages', label: 'Ghim tin nhắn', description: 'Có thể ghim tin nhắn quan trọng' },
  { id: 'addNewAdmins', label: 'Thêm quản trị viên', description: 'Có thể thêm quản trị viên mới' },
  { id: 'approveJoinRequests', label: 'Duyệt yêu cầu tham gia', description: 'Có thể duyệt yêu cầu tham gia nhóm' }
]

// Tạo schema cho form
const memberPermissionsSchema = z.object({
  role: z.enum([MEMBER_ROLE.OWNER, MEMBER_ROLE.ADMIN, MEMBER_ROLE.MEMBER, MEMBER_ROLE.BOT]),
  customTitle: z.string().max(30, 'Chức danh không được quá 30 ký tự').optional(),
  permissions: z.object({
    changeGroupInfo: z.boolean().default(false),
    deleteMessages: z.boolean().default(false),
    banUsers: z.boolean().default(false),
    inviteUsers: z.boolean().default(true),
    pinMessages: z.boolean().default(false),
    addNewAdmins: z.boolean().default(false),
    approveJoinRequests: z.boolean().default(false)
  })
})

type MemberPermissionsFormValues = z.infer<typeof memberPermissionsSchema>

export function GroupPermissionsManager({ conversation }: { conversation: any }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('members')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentUserId = session?.user?._id
  const isOwner = conversation?.userId === currentUserId

  // Lấy danh sách thành viên và vai trò của họ
  const members = conversation?.participants || []
  
  // Lọc thành viên theo tìm kiếm
  const filteredMembers = members.filter((member: any) => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Form setup với React Hook Form
  const form = useForm<MemberPermissionsFormValues>({
    resolver: zodResolver(memberPermissionsSchema),
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
  
  // Mutation để cập nhật vai trò và quyền của thành viên
  const updateMemberRoleMutation = useMutation({
    mutationFn: (data: { 
      userId: string; 
      role: string; 
      permissions: Record<string, boolean>; 
      customTitle?: string 
    }) => conversationsService.updateGroupMemberRole(conversation._id, data),
    onSuccess: () => {
      toast.success('Đã cập nhật quyền thành viên')
      queryClient.invalidateQueries({ queryKey: ['conversations', conversation._id] })
      setSelectedMember(null)
      setActiveTab('members')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật quyền')
    }
  })

  // Xử lý khi chọn một thành viên
  const handleSelectMember = (member: any) => {
    setSelectedMember(member)
    
    // Tìm thông tin chi tiết của thành viên trong members array
    const memberDetail = conversation.members?.find((m: any) => m.userId.toString() === member._id.toString())
    
    // Reset form với giá trị hiện tại của thành viên
    form.reset({
      role: memberDetail?.role || MEMBER_ROLE.MEMBER,
      customTitle: memberDetail?.customTitle || '',
      permissions: {
        changeGroupInfo: memberDetail?.permissions?.changeGroupInfo || false,
        deleteMessages: memberDetail?.permissions?.deleteMessages || false,
        banUsers: memberDetail?.permissions?.banUsers || false,
        inviteUsers: memberDetail?.permissions?.inviteUsers || true,
        pinMessages: memberDetail?.permissions?.pinMessages || false,
        addNewAdmins: memberDetail?.permissions?.addNewAdmins || false,
        approveJoinRequests: memberDetail?.permissions?.approveJoinRequests || false
      }
    })
    
    // Chuyển sang tab phân quyền
    setActiveTab('permissions')
  }
  
  // Xử lý khi thay đổi vai trò
  const handleRoleChange = (role: string) => {
    // Cập nhật quyền mặc định dựa trên vai trò
    if (role === MEMBER_ROLE.ADMIN) {
      form.setValue('permissions', {
        changeGroupInfo: true,
        deleteMessages: true,
        banUsers: true,
        inviteUsers: true,
        pinMessages: true,
        addNewAdmins: false,
        approveJoinRequests: true
      })
    } else if (role === MEMBER_ROLE.MEMBER) {
      form.setValue('permissions', {
        changeGroupInfo: false,
        deleteMessages: false,
        banUsers: false,
        inviteUsers: true,
        pinMessages: false,
        addNewAdmins: false,
        approveJoinRequests: false
      })
    }
    
    form.setValue('role', role as any)
  }
  
  // Xử lý khi submit form
  const onSubmit = (values: MemberPermissionsFormValues) => {
    if (!selectedMember) return
    
    updateMemberRoleMutation.mutate({
      userId: selectedMember._id,
      role: values.role,
      permissions: values.permissions,
      customTitle: values.customTitle
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Shield className="mr-2 h-4 w-4" />
          Quản lý quyền
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Quản lý quyền nhóm</SheetTitle>
          <SheetDescription>
            Phân quyền cho các thành viên trong nhóm
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-2 mt-2">
              <TabsTrigger value="members">Thành viên</TabsTrigger>
              <TabsTrigger value="permissions" disabled={!selectedMember}>Phân quyền</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="members" className="m-0 p-0">
            <div className="p-4">
              <div className="mb-4">
                <Input
                  placeholder="Tìm kiếm thành viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <h3 className="text-sm font-medium mb-2">Danh sách thành viên</h3>
              <ScrollArea className="h-[400px] rounded-md border p-2">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member: any) => (
                    <div 
                      key={member._id} 
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent ${selectedMember?._id === member._id ? 'bg-accent' : ''}`}
                      onClick={() => handleSelectMember(member)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.name}
                            {member._id === conversation.userId && (
                              <span className="text-muted-foreground ml-2 text-xs">(Chủ nhóm)</span>
                            )}
                            {member._id === currentUserId && member._id !== conversation.userId && (
                              <span className="text-muted-foreground ml-2 text-xs">(Bạn)</span>
                            )}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            {getRoleIcon(getMemberRole(member._id))}
                            <span className="ml-1">{getRoleName(getMemberRole(member._id))}</span>
                            {getMemberCustomTitle(member._id) && (
                              <span className="text-blue-500 ml-2">({getMemberCustomTitle(member._id)})</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <UserX className="h-12 w-12 mb-2 opacity-50" />
                    <p>Không tìm thấy thành viên</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="permissions" className="m-0 p-0">
            {selectedMember && (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />
                    <AvatarFallback>{selectedMember.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedMember.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember._id === conversation.userId ? 'Chủ nhóm' : 'Thành viên từ ' + new Date(getMemberJoinedAt(selectedMember._id) || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vai trò</FormLabel>
                          <Select 
                            onValueChange={(value) => handleRoleChange(value)}
                            defaultValue={field.value}
                            disabled={selectedMember._id === conversation.userId || !isOwner}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn vai trò" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={MEMBER_ROLE.OWNER} disabled={true}>Chủ nhóm</SelectItem>
                              <SelectItem value={MEMBER_ROLE.ADMIN}>Quản trị viên</SelectItem>
                              <SelectItem value={MEMBER_ROLE.MEMBER}>Thành viên</SelectItem>
                              <SelectItem value={MEMBER_ROLE.BOT} disabled={true}>Bot</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === MEMBER_ROLE.ADMIN 
                              ? 'Quản trị viên có thể quản lý nhóm và thành viên'
                              : field.value === MEMBER_ROLE.MEMBER 
                                ? 'Thành viên có các quyền cơ bản trong nhóm'
                                : 'Chủ nhóm có toàn quyền quản lý nhóm'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chức danh tùy chỉnh</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ví dụ: Trưởng ban nội dung"
                              disabled={!isOwner && selectedMember._id !== currentUserId}
                              maxLength={30}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Chức danh sẽ hiển thị bên cạnh tên thành viên
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Quyền hạn</h4>
                      <div className="space-y-3">
                        {PERMISSIONS.map(perm => (
                          <FormField
                            key={perm.id}
                            control={form.control}
                            name={`permissions.${perm.id}` as any}
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>{perm.label}</FormLabel>
                                  <FormDescription>
                                    {perm.description}
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={
                                      selectedMember._id === conversation.userId || 
                                      !isOwner || 
                                      (form.getValues('role') === MEMBER_ROLE.OWNER) || 
                                      (form.getValues('role') === MEMBER_ROLE.MEMBER && perm.id !== 'inviteUsers')
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          setSelectedMember(null)
                          setActiveTab('members')
                        }}
                      >
                        Hủy
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateMemberRoleMutation.isPending || !isOwner}
                      >
                        {updateMemberRoleMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
  
  // Helper functions
  function getMemberRole(userId: string): string {
    const member = conversation.members?.find((m: any) => m.userId.toString() === userId.toString())
    return member?.role || MEMBER_ROLE.MEMBER
  }
  
  function getMemberCustomTitle(userId: string): string | undefined {
    const member = conversation.members?.find((m: any) => m.userId.toString() === userId.toString())
    return member?.customTitle
  }
  
  function getMemberJoinedAt(userId: string): Date | undefined {
    const member = conversation.members?.find((m: any) => m.userId.toString() === userId.toString())
    return member?.joinedAt
  }
  
  function getRoleName(role: string): string {
    switch (role) {
      case MEMBER_ROLE.OWNER:
        return 'Chủ nhóm'
      case MEMBER_ROLE.ADMIN:
        return 'Quản trị viên'
      case MEMBER_ROLE.BOT:
        return 'Bot'
      default:
        return 'Thành viên'
    }
  }
  
  // Hiển thị icon tương ứng với vai trò
  function getRoleIcon(role: string) {
    switch (role) {
      case MEMBER_ROLE.OWNER:
        return <ShieldAlert className="h-4 w-4 text-yellow-500" />
      case MEMBER_ROLE.ADMIN:
        return <ShieldCheck className="h-4 w-4 text-blue-500" />
      case MEMBER_ROLE.BOT:
        return <Bot className="h-4 w-4 text-purple-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }
}




