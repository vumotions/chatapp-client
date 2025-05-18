import { useQuery } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { debounce } from 'lodash'
import friendService from '~/services/friend.service'
import userService from '~/services/user.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Hook để tìm kiếm người dùng
export const useSearchUsers = (initialQuery = '') => {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)

  // Tạo hàm debounced để cập nhật debouncedQuery
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value)
      setIsSearching(false)
    }, 500),
    []
  )

  // Cập nhật searchQuery và gọi hàm debounced
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setIsSearching(true)
    debouncedSetQuery(value)
  }

  // Cleanup debounce khi unmount
  useEffect(() => {
    return () => {
      debouncedSetQuery.cancel()
    }
  }, [debouncedSetQuery])

  // Lấy danh sách người dùng với tìm kiếm
  const { data = [], isLoading } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: async () => {
      try {
        if (!debouncedQuery.trim()) return []
        const response = await friendService.searchUsers(debouncedQuery)
        return response?.data?.data || []
      } catch (error) {
        console.error('Error searching users:', error)
        return []
      }
    },
    enabled: !!debouncedQuery.trim(),
    staleTime: 30000, // Giữ dữ liệu trong cache 30 giây để tránh gọi API lại khi quay lại
    refetchOnWindowFocus: false // Không refetch khi focus lại window
  })

  return {
    searchQuery,
    users: data,
    isLoading: isLoading || isSearching,
    handleSearchChange,
    setSearchQuery
  }
}

// Hook để lấy thông tin người dùng theo username
export const useUserByUsername = (username: string) => {
  return useQuery({
    queryKey: ['user', 'profile', username],
    queryFn: async () => {
      try {
        if (!username) return null
        const response = await userService.getUserByUsername(username)
        return response?.data?.data || null
      } catch (error) {
        console.error('Error fetching user profile:', error)
        throw error
      }
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // Cache trong 5 phút
    retry: 1, // Thử lại 1 lần nếu có lỗi
    refetchOnWindowFocus: false // Không refetch khi focus lại window
  })
}

// Hook để cập nhật thông tin cá nhân
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => userService.updateProfile(data),
    onSuccess: () => {
      // Invalidate các query liên quan đến user để cập nhật dữ liệu
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    },
    onError: (error: any) => {
      console.error('Error updating profile:', error)
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin')
    }
  })
}













