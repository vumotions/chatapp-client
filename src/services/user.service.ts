import httpRequest from '~/config/http-request'

class UserService {
  // Lấy thông tin người dùng theo username
  getUserByUsername(username: string) {
    return httpRequest.get(`/user/profile/${username}`)
  }
}

const userService = new UserService()
export default userService



