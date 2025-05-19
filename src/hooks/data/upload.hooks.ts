import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import uploadService from '~/services/upload.service'

interface UseFileUploadOptions {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  usePostApi?: boolean // Tùy chọn sử dụng API tạo post để upload
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    onSuccess,
    onError,
    maxFileSize = 10, // Default 10MB
    allowedTypes = [], // Empty array means all types allowed
    usePostApi = false // Mặc định sử dụng API upload riêng
  } = options

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (filesToUpload: File[]) => {
      console.log('Mutation called with files:', filesToUpload)
      
      // Sử dụng API tạo post nếu được chỉ định
      if (usePostApi) {
        return uploadService.testUpload(filesToUpload)
      }
      
      // Mặc định sử dụng API upload riêng
      return uploadService.uploadFiles(filesToUpload)
    },
    onSuccess: (response) => {
      console.log('Upload success response:', response)
      toast.success('Upload thành công!')
      resetFiles()
      
      // Xử lý response khác nhau giữa hai API
      if (usePostApi) {
        // Nếu sử dụng API tạo post
        if (onSuccess) onSuccess(response.data)
      } else {
        // Nếu sử dụng API upload riêng
        if (onSuccess) onSuccess(response.data)
      }
    },
    onError: (error: any) => {
      console.error('Error uploading files:', error)
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi upload files')
      if (onError) onError(error)
    }
  })

  // Validate files
  const validateFiles = (filesToValidate: File[]): boolean => {
    if (!filesToValidate || filesToValidate.length === 0) {
      console.log('No files to validate')
      return false
    }
    
    console.log('Validating files:', filesToValidate)
    
    // Check file size
    const oversizedFiles = filesToValidate.filter(
      file => file.size > maxFileSize * 1024 * 1024
    )
    
    if (oversizedFiles.length > 0) {
      toast.error(`Một số file vượt quá kích thước tối đa ${maxFileSize}MB`, {
        description: oversizedFiles.map(f => f.name).join(', ')
      })
      return false
    }
    
    // Check file types if specified
    if (allowedTypes.length > 0) {
      const invalidFiles = filesToValidate.filter(
        file => !allowedTypes.some(type => file.type.includes(type))
      )
      
      if (invalidFiles.length > 0) {
        toast.error(`Một số file không đúng định dạng cho phép`, {
          description: `Chỉ chấp nhận: ${allowedTypes.join(', ')}`
        })
        return false
      }
    }
    
    return true
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input change event:', e.target.files)
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      console.log('Selected files:', selectedFiles)
      
      if (validateFiles(selectedFiles)) {
        setFiles(selectedFiles)
      } else {
        // Reset input if validation fails
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  }
  
  // Upload files
  const uploadFiles = () => {
    console.log('uploadFiles called with files:', files)
    
    if (files.length === 0) {
      toast.error('Vui lòng chọn ít nhất một file để upload')
      return
    }
    
    uploadMutation.mutate(files)
  }
  
  // Reset files
  const resetFiles = () => {
    setFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Add files programmatically
  const addFiles = (newFiles: File[]) => {
    if (validateFiles(newFiles)) {
      setFiles(prev => [...prev, ...newFiles])
    }
  }
  
  return {
    files,
    isUploading: uploadMutation.isPending,
    uploadFiles,
    handleFileChange,
    resetFiles,
    addFiles,
    fileInputRef,
    uploadResponse: uploadMutation.data?.data
  }
}

