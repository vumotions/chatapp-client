import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { use } from 'react'
import { Toaster } from 'sonner'
import { CallManager } from '~/components/call/call-manager'
import { NetworkStatus } from '~/components/network-status'
import NotificationListener from '~/components/notification-listener'
import TokenRefresher from '~/components/token-refresher'
import { routing } from '~/i18n/routing'
import BProgressProvider from '~/providers/bprogress-provider'
import NextAuthProvider from '~/providers/nextauth-provider'
import ReactQueryProvider from '~/providers/query-client-provider'
import SocketProvider from '~/providers/socket-provider'
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
            <ThemeProvider attribute='class' defaultTheme='dark' enableSystem disableTransitionOnChange>
              <BProgressProvider>
                <ReactQueryProvider>
                  <SocketProvider>
                    {children}
                    <CallManager />
                  </SocketProvider>
                  <TokenRefresher />
                  <NotificationListener />
                  <Toaster
                    position='bottom-left'
                    toastOptions={{
                      style: {
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)'
                      },
                      actionButtonStyle: {
                        backgroundColor: 'var(--primary)',
                        color: 'var(--primary-foreground)'
                      }
                    }}
                  />
                  <NetworkStatus />
                </ReactQueryProvider>
              </BProgressProvider>
            </ThemeProvider>
          </NextAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default Layout
