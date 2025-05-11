import { CreateGroupChatDialog } from '~/components/create-group-chat-dialog'

function Messages() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-xl font-semibold">Tin nhắn</h1>
        <div className="flex items-center gap-2">
          <CreateGroupChatDialog />
          {/* Các nút khác nếu có */}
        </div>
      </div>
      {/* Phần còn lại của component */}
    </div>
  )
}

export default Messages
