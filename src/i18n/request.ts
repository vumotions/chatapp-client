import fs from 'fs'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import path from 'path'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  const messagesDir = path.join(process.cwd(), 'messages', locale)
  const files = fs.readdirSync(messagesDir).filter((file) => file.endsWith('.json'))
  const fileContents = await Promise.all(
    files.map(async (file) => (await import(`../../messages/${locale}/${file}`)).default)
  )
  const mergedFilesLocale = Object.assign({}, ...fileContents)
  return {
    locale,
    messages: mergedFilesLocale
  }
})
