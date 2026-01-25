'use client'

import { useEffect } from 'react'
import { getBrowserPreferredLanguage, useLanguageStore, type AppLanguage } from '@/lib/stores/language-store'

interface LanguageProviderProps {
  children: React.ReactNode
  initialLanguage?: AppLanguage
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const hydrated = useLanguageStore((s) => s.hydrated)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  useEffect(() => {
    if (hydrated) return
    const preferred = initialLanguage || getBrowserPreferredLanguage()
    setLanguage(preferred)
  }, [hydrated, initialLanguage, setLanguage])

  return <>{children}</>
}

