import { useMessagesTranslation } from "~/hooks/use-translations"

function Messages() {
  const t = useMessagesTranslation()
  
  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <h1 className='text-xl font-semibold'>{t('title')}</h1>
      </div>
      <div className='flex h-full items-center justify-center p-4'>
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-medium'>{t('selectChatToStart')}</h2>
          <p className='text-muted-foreground'>{t('selectFromLeftSidebar')}</p>
        </div>
      </div>
    </div>
  )
}

export default Messages
