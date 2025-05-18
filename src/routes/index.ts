const routes = {
  authRoutes: ['/auth/login', '/auth/register', '/auth/recover/code'],
  publicRoutes: ['/', '/terms', '/privacy'],
  privateRoutes: ['/messages', '/settings', '/profile/:username', '/group/join/:inviteLink']
}

export default routes
