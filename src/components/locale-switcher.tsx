'use client'

import { Locale, useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useTransition } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { usePathname, useRouter } from '~/i18n/navigation'
import { routing } from '~/i18n/routing'
import { useCommonTranslation } from '~/hooks/use-translations'

function LocaleSwitcher() {
  const commonT = useCommonTranslation()
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const params = useParams()

  const onSelectLocale = (locale: Locale) => {
    startTransition(() => {
      // @ts-expect-error -- TypeScript will validate that only known `params`
      router.replace({ pathname, params }, { locale })
    })
  }

  return (
    <Select onValueChange={onSelectLocale} defaultValue={locale}>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder={commonT('selectLanguage')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {routing.locales.map((cur) => (
            <SelectItem value={cur} key={cur} disabled={isPending}>
              {commonT(`languages.${cur}`)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export default LocaleSwitcher
