const routes = {
  authRoutes: ['/auth/login', '/auth/register', '/auth/recover/code', '/auth/forgot-password'],
  publicRoutes: ['/terms', '/privacy'],
  privateRoutes: ['/', '/messages', '/settings', '/profile/:username', '/group/join/:inviteLink'],
  underDevelopmentRoutes: ['/settings/notifications']
}

export default routes
