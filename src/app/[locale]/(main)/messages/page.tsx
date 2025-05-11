function Messages() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-xl font-semibold">Tin nhắn</h1>
      </div>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">Chọn đoạn chat để bắt đầu</h2>
          <p className="text-muted-foreground">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin</p>
        </div>
      </div>
    </div>
  )
}

export default Messages
