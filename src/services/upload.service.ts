import httpRequest from '~/config/http-request'

class UploadService {
  uploadFiles(files: File[]) {
    const formData = new FormData()

    files.forEach((file) => {
      formData.append('files', file)
    })

    return httpRequest.post('/upload/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

const uploadService = new UploadService()
export default uploadService
