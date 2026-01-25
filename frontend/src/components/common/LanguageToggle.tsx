'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'
import { useT } from '@/i18n'

interface LanguageToggleProps {
  iconOnly?: boolean
}

export function LanguageToggle({ iconOnly = false }: LanguageToggleProps) {
  const { language, setLanguage, t } = useT()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={iconOnly ? 'ghost' : 'outline'}
          size={iconOnly ? 'icon' : 'default'}
          className={iconOnly ? 'h-9 w-full' : 'w-full justify-start gap-2'}
        >
          <Languages className="h-4 w-4" />
          {!iconOnly && <span>{t('common.language')}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          <span>{t('common.english')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('zh-CN')}
          className={language === 'zh-CN' ? 'bg-accent' : ''}
        >
          <span>{t('common.chinese')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

