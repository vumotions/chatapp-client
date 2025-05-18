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
}

const userService = new UserService()
export default userService

