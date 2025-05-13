import { useQuery } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { debounce } from 'lodash'
import friendService from '~/services/friend.service'

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
