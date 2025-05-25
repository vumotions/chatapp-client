import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import uploadService from '~/services/upload.service'

interface UseFileUploadOptions {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export const useFileUpload = (options?: UseFileUploadOptions) => {
  const { onSuccess, onError } = options || {}

  return useMutation({
    mutationFn: (files: File[]) => {
      if (!files || files.length === 0) {
        return Promise.reject(new Error('No files to upload'))
      }
      return uploadService.uploadFiles(files)
    },
    onSuccess: (response) => {
      console.log('Upload response:', response)

      // Trích xuất dữ liệu từ response theo cấu trúc đúng
      const files = response?.data?.data?.files || []
      const urls = response?.data?.data?.urls || []

      // Gọi callback onSuccess nếu được cung cấp
      if (onSuccess) {
        onSuccess({ urls, files })
      }
    },
    onError: (error: any) => {
      console.error('Error uploading files:', error)
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi upload files')

      // Gọi callback onError nếu được cung cấp
      if (onError) {
        onError(error)
      }
    }
  })
}
