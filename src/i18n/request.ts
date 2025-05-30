import fs from 'fs'
import path from 'path'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const messagesDir = path.join(process.cwd(), 'src', 'messages', locale)

  const files = fs.readdirSync(messagesDir).filter((file) => file.endsWith('.json'))
  const fileContents = files.map((file) => {
    const content = fs.readFileSync(path.join(messagesDir, file), 'utf-8')
    return JSON.parse(content)
  })

  const mergedFilesLocale = Object.assign({}, ...fileContents)

  return {
    locale,
    messages: mergedFilesLocale
  }
})
