'use client'

import { useSession } from 'next-auth/react'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { usePathname, useRouter } from '~/i18n/navigation'
import { getBrowserLocale } from '~/lib/utils'
import { useUpdateSettingsMutation, useUserSettings } from './data/user.hooks'

export function useSyncUserPreferences() {
  const { theme, setTheme } = useTheme()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { data: session } = useSession()
  const { data: userSettings, isLoading } = useUserSettings()
  const updateSettingsMutation = useUpdateSettingsMutation()

  useEffect(() => {
    // Chỉ thực hiện khi có session và đã load xong userSettings
    if (!session || isLoading || !userSettings) return

    const userTheme = userSettings.preferences?.theme
    if (userTheme && theme !== userTheme) {
      setTheme(userTheme)
    }

    // Đồng bộ language
    const userLanguage = userSettings.preferences?.language

    // Nếu người dùng chưa có language preference
    if (!userLanguage) {
      // Lấy locale từ trình duyệt
      const browserLocale = getBrowserLocale()
      const preferredLocale = browserLocale || 'en'

      // Cập nhật settings với locale ưa thích
      updateSettingsMutation.mutateAsync({
        language: preferredLocale,
        theme: userTheme || theme || 'system'
      })

      if (locale !== preferredLocale) {
        // @ts-expect-error -- TypeScript will validate that only known `params`
        router.replace({ pathname, params }, { locale: preferredLocale })
      }
    } else {
      if (locale !== userLanguage) {
        // @ts-expect-error -- TypeScript will validate that only known `params`
        router.replace({ pathname, params }, { locale: userLanguage })
      }
    }
  }, [userSettings, isLoading, theme, setTheme, locale, router, pathname, params, updateSettingsMutation, session])

  return null
}
