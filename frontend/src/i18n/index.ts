import { enMessages } from '@/i18n/messages/en'
import { zhCNMessages } from '@/i18n/messages/zh-CN'
import { useLanguageStore, type AppLanguage } from '@/lib/stores/language-store'

const messagesByLanguage: Record<AppLanguage, Record<string, string>> = {
  en: enMessages,
  'zh-CN': zhCNMessages,
}

export type TranslationKey = string

type InterpolationValues = Record<string, string | number | boolean | null | undefined>

function interpolate(template: string, values?: InterpolationValues) {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key]
    if (value === null || value === undefined) return ''
    return String(value)
  })
}

export function t(language: AppLanguage, key: TranslationKey, values?: InterpolationValues) {
  const langMessages = messagesByLanguage[language] || messagesByLanguage.en
  const raw = langMessages[key] ?? messagesByLanguage.en[key] ?? String(key)
  return interpolate(raw, values)
}

export function useT() {
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  return {
    language,
    setLanguage,
    t: (key: TranslationKey, values?: InterpolationValues) => t(language, key, values),
  }
}
