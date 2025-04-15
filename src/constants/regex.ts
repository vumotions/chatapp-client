import routes from '~/routes'
import { LOCALES } from './locales'

const emailRgx = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
const publicRouteRegex = RegExp(
  `^(/(${LOCALES.join('|')}))?(${routes.publicRoutes.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
  'i'
)
const privateRouteRegex = RegExp(
  `^(/(${LOCALES.join('|')}))?(${routes.privateRoutes.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
  'i'
)
const authRouteRegex = RegExp(
  `^(/(${LOCALES.join('|')}))?(${routes.authRoutes.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
  'i'
)

export { emailRgx, publicRouteRegex, privateRouteRegex, authRouteRegex }
