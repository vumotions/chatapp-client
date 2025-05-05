import React from 'react'
import { Button } from '../ui/button'
import { ImageIcon } from 'lucide-react'

function PostEditor() {
  return (
    <div className='bg-card flex flex-col gap-5 rounded-2xl p-5 shadow-sm'>
      {/* <div className='flex gap-5'>
        <UserAvatar avatarUrl={user?.avatarUrl} className='hidden sm:inline' />
        <div className='w-full'>
          <EditorContent
            editor={editor}
            className={cn(
              'bg-background max-h-[20rem] w-full overflow-y-auto rounded-2xl px-5 py-3',
              isDragActive && 'outline-dashed'
            )}
            onPaste={onPaste}
          />
          <input {...getInputProps()} />
        </div>
      </div>
      {!!attachments.length && <AttachmentPreviews attachments={attachments} removeAttachment={removeAttachment} />}
      <div className='flex items-center justify-end gap-3'>
        {isUploading && (
          <>
            <span className='text-sm'>{uploadProgress ?? 0}%</span>
            <Loader2 className='text-primary size-5 animate-spin' />
          </>
        )}
        <AddAttachmentsButton onFilesSelected={startUpload} disabled={isUploading || attachments.length >= 5} />
        <Button className='min-w-20'>Post</Button>
      </div> */}
    </div>
  )
}

// interface AddAttachmentsButtonProps {
//   onFilesSelected: (files: File[]) => void
//   disabled: boolean
// }

// function AddAttachmentsButton({ onFilesSelected, disabled }: AddAttachmentsButtonProps) {
//   const fileInputRef = useRef<HTMLInputElement>(null)

//   return (
//     <>
//       <Button
//         variant='ghost'
//         size='icon'
//         className='text-primary hover:text-primary'
//         disabled={disabled}
//         onClick={() => fileInputRef.current?.click()}
//       >
//         <ImageIcon size={20} />
//       </Button>
//       <input
//         type='file'
//         accept='image/*, video/*'
//         multiple
//         ref={fileInputRef}
//         className='sr-only hidden'
//         onChange={(e) => {
//           const files = Array.from(e.target.files || [])
//           if (files.length) {
//             onFilesSelected(files)
//             e.target.value = ''
//           }
//         }}
//       />
//     </>
//   )
// }

// interface AttachmentPreviewsProps {
//   attachments: Attachment[]
//   removeAttachment: (fileName: string) => void
// }

// function AttachmentPreviews({ attachments, removeAttachment }: AttachmentPreviewsProps) {
//   return (
//     <div className={cn('flex flex-col gap-3', attachments.length > 1 && 'sm:grid sm:grid-cols-2')}>
//       {attachments.map((attachment) => (
//         <AttachmentPreview
//           key={attachment.file.name}
//           attachment={attachment}
//           onRemoveClick={() => removeAttachment(attachment.file.name)}
//         />
//       ))}
//     </div>
//   )
// }

// interface AttachmentPreviewProps {
//   attachment: Attachment
//   onRemoveClick: () => void
// }

// function AttachmentPreview({ attachment: { file, mediaId, isUploading }, onRemoveClick }: AttachmentPreviewProps) {
//   const src = URL.createObjectURL(file)

//   return (
//     <div className={cn('relative mx-auto size-fit', isUploading && 'opacity-50')}>
//       {file.type.startsWith('image') ? (
//         <Image
//           src={src}
//           alt='Attachment preview'
//           width={500}
//           height={500}
//           className='size-fit max-h-[30rem] rounded-2xl'
//         />
//       ) : (
//         <video controls className='size-fit max-h-[30rem] rounded-2xl'>
//           <source src={src} type={file.type} />
//         </video>
//       )}
//       {!isUploading && (
//         <button
//           onClick={onRemoveClick}
//           className='bg-foreground text-background hover:bg-foreground/60 absolute top-3 right-3 rounded-full p-1.5 transition-colors'
//         >
//           <X size={20} />
//         </button>
//       )}
//     </div>
//   )
// }

// export default PostEditor
