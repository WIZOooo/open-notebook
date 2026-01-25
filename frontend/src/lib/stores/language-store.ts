import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppLanguage = 'en' | 'zh-CN'

interface LanguageState {
  language: AppLanguage
  hydrated: boolean
  setHydrated: (hydrated: boolean) => void
  setLanguage: (language: AppLanguage) => void
}

const COOKIE_NAME = 'language'

function applyLanguageToDocument(language: AppLanguage) {
  if (typeof window === 'undefined') return
  window.document.documentElement.lang = language
}

function setLanguageCookie(language: AppLanguage) {
  if (typeof window === 'undefined') return
  const maxAgeSeconds = 60 * 60 * 24 * 365
  window.document.cookie = `${COOKIE_NAME}=${encodeURIComponent(language)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      hydrated: false,
      setHydrated: (hydrated: boolean) => set({ hydrated }),
      setLanguage: (language: AppLanguage) => {
        set({ language })
        applyLanguageToDocument(language)
        setLanguageCookie(language)
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
        if (state?.language) {
          applyLanguageToDocument(state.language)
          setLanguageCookie(state.language)
        }
      },
    }
  )
)

export function getBrowserPreferredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en'
  const lang = window.navigator.language || 'en'
  return lang.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

