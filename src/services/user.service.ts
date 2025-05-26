import httpRequest from '~/config/http-request'

class UserService {
  // Lấy thông tin người dùng theo username
  getUserByUsername(username: string) {
    return httpRequest.get(`/user/profile/${username}`)
  }

  // Thêm phương thức cập nhật thông tin cá nhân
  updateProfile(data: any) {
    return httpRequest.patch('/user/my-profile', data)
  }

  // Block user
  blockUser(userId: string) {
    return httpRequest.post('/user/block', { userId })
  }

  // Unblock user
  unblockUser(userId: string) {
    return httpRequest.post('/user/unblock', { userId })
  }

  // Get blocked users
  getBlockedUsers() {
    return httpRequest.get('/user/blocked-users')
  }

  async getSettings() {
    const res = await httpRequest.get('/user/settings')
    return res.data
  }

  async updateSettings(data: { language?: string; theme?: string }) {
    return httpRequest.patch('/user/settings', data)
  }
}

const userService = new UserService()
export default userService
