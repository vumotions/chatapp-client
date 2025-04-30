import { atom, useAtom } from 'jotai'
import { Mail, mails } from '../app/[locale]/(main)/messages/data'

type Config = {
  selected: Mail['id'] | null
}

const configAtom = atom<Config>({
  selected: null
})

export function useMail() {
  return useAtom(configAtom)
}
