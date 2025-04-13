import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { use } from 'react'
import { Toaster } from '~/components/ui/sonner'
import { routing } from '~/i18n/routing'
import BProgressProvider from '~/providers/bprogress-provider'
import NextAuthProvider from '~/providers/nextauth-provider'
import ReactQueryProvider from '~/providers/query-client-provider'
import { ThemeProvider } from '~/providers/theme-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Teleface',
  description: 'This site created by Vu Motions'
}

type Props = {
  children: React.ReactNode
  params: Promise<{
    locale: string
  }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

function Layout({ params, children }: Props) {
  const { locale } = use(params)
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = use(getMessages())
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NextAuthProvider>
            <BProgressProvider>
              <ThemeProvider attribute='class' defaultTheme='dark' enableSystem disableTransitionOnChange>
                <ReactQueryProvider>{children}</ReactQueryProvider>
                <Toaster position='top-center' />
              </ThemeProvider>
            </BProgressProvider>
          </NextAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default Layout
