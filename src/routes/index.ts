const routes = {
  authRoutes: ['/auth/login', '/auth/register', '/auth/recover/code', '/auth/forgot-password'],
  publicRoutes: ['/terms', '/privacy'],
  privateRoutes: ['/', '/messages', '/settings', '/profile/:username', '/group/join/:inviteLink'],
  underDevelopmentRoutes: ['/settings/notifications'] // Thêm danh sách các route đang phát triển
}

export default routes
