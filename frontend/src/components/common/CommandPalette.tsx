'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useTheme } from '@/lib/stores/theme-store'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  FileText,
  Wrench,
  MessageCircleQuestion,
  Plus,
  Sun,
  Moon,
  Monitor,
  Loader2,
} from 'lucide-react'
import { useT } from '@/i18n'

export function CommandPalette() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } = useCreateDialogs()
  const { setTheme } = useTheme()
  const { data: notebooks, isLoading: notebooksLoading } = useNotebooks(false)

  const navigationItems = useMemo(
    () => [
      { name: t('sidebar.nav.sources'), href: '/sources', icon: FileText, keywords: ['files', 'documents', 'upload', '来源', '文件'] },
      { name: t('sidebar.nav.notebooks'), href: '/notebooks', icon: Book, keywords: ['notes', 'research', 'projects', '笔记本', '笔记'] },
      { name: t('sidebar.nav.ask_search'), href: '/search', icon: Search, keywords: ['find', 'query', '搜索', '提问'] },
      { name: t('sidebar.nav.podcasts'), href: '/podcasts', icon: Mic, keywords: ['audio', 'episodes', 'generate', '播客'] },
      { name: t('sidebar.nav.models'), href: '/models', icon: Bot, keywords: ['ai', 'llm', 'providers', 'openai', 'anthropic', '模型'] },
      { name: t('sidebar.nav.transformations'), href: '/transformations', icon: Shuffle, keywords: ['prompts', 'templates', 'actions', '转换'] },
      { name: t('sidebar.nav.settings'), href: '/settings', icon: Settings, keywords: ['preferences', 'config', 'options', '设置'] },
      { name: t('sidebar.nav.advanced'), href: '/advanced', icon: Wrench, keywords: ['debug', 'system', 'tools', '高级'] },
    ],
    [t]
  )

  const createItems = useMemo(
    () => [
      { name: t('command_palette.create.source'), action: 'source', icon: FileText },
      { name: t('command_palette.create.notebook'), action: 'notebook', icon: Book },
      { name: t('command_palette.create.podcast'), action: 'podcast', icon: Mic },
    ],
    [t]
  )

  const themeItems = useMemo(
    () => [
      { name: t('command_palette.theme.light'), value: 'light' as const, icon: Sun, keywords: ['bright', 'day', '浅色'] },
      { name: t('command_palette.theme.dark'), value: 'dark' as const, icon: Moon, keywords: ['night', '深色'] },
      { name: t('command_palette.theme.system'), value: 'system' as const, icon: Monitor, keywords: ['auto', 'default', '系统'] },
    ],
    [t]
  )

  // Global keyboard listener for ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Skip if focus is inside editable elements
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }

      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        setOpen((open) => !open)
      }
    }

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', down, true)
    return () => document.removeEventListener('keydown', down, true)
  }, [])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false)
    setQuery('')
    // Use setTimeout to ensure dialog closes before action
    setTimeout(callback, 0)
  }, [])

  const handleNavigate = useCallback((href: string) => {
    handleSelect(() => router.push(href))
  }, [handleSelect, router])

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}&mode=search`))
  }, [handleSelect, router, query])

  const handleAsk = useCallback(() => {
    if (!query.trim()) return
    handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}&mode=ask`))
  }, [handleSelect, router, query])

  const handleCreate = useCallback((action: string) => {
    handleSelect(() => {
      if (action === 'source') openSourceDialog()
      else if (action === 'notebook') openNotebookDialog()
      else if (action === 'podcast') openPodcastDialog()
    })
  }, [handleSelect, openSourceDialog, openNotebookDialog, openPodcastDialog])

  const handleTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    handleSelect(() => setTheme(theme))
  }, [handleSelect, setTheme])

  // Check if query matches any command (navigation, create, theme, or notebook)
  const queryLower = query.toLowerCase().trim()
  const hasCommandMatch = useMemo(() => {
    if (!queryLower) return false
    return (
      navigationItems.some(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.keywords.some(k => k.includes(queryLower))
      ) ||
      createItems.some(item =>
        item.name.toLowerCase().includes(queryLower)
      ) ||
      themeItems.some(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.keywords.some(k => k.includes(queryLower))
      ) ||
      (notebooks?.some(nb =>
        nb.name.toLowerCase().includes(queryLower) ||
        (nb.description && nb.description.toLowerCase().includes(queryLower))
      ) ?? false)
    )
  }, [queryLower, notebooks, navigationItems, createItems, themeItems])

  // Determine if we should show the Search/Ask section at the top
  const showSearchFirst = query.trim() && !hasCommandMatch

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('command_palette.title')}
      description={t('command_palette.desc')}
      className="sm:max-w-lg"
    >
      <CommandInput
        placeholder={t('command_palette.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Search/Ask - show FIRST when there's a query with no command match */}
        {showSearchFirst && (
          <CommandGroup heading={t('command_palette.group.search_ask')} forceMount>
            <CommandItem
              value={`__search__ ${query}`}
              onSelect={handleSearch}
              forceMount
            >
              <Search className="h-4 w-4" />
              <span>{t('command_palette.search_for', { query })}</span>
            </CommandItem>
            <CommandItem
              value={`__ask__ ${query}`}
              onSelect={handleAsk}
              forceMount
            >
              <MessageCircleQuestion className="h-4 w-4" />
              <span>{t('command_palette.ask_about', { query })}</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading={t('command_palette.group.navigation')}>
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => handleNavigate(item.href)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Notebooks */}
        <CommandGroup heading={t('command_palette.group.notebooks')}>
          {notebooksLoading ? (
            <CommandItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('command_palette.loading_notebooks')}</span>
            </CommandItem>
          ) : notebooks && notebooks.length > 0 ? (
            notebooks.map((notebook) => (
              <CommandItem
                key={notebook.id}
                value={`notebook ${notebook.name} ${notebook.description || ''}`}
                onSelect={() => handleNavigate(`/notebooks/${notebook.id}`)}
              >
                <Book className="h-4 w-4" />
                <span>{notebook.name}</span>
              </CommandItem>
            ))
          ) : null}
        </CommandGroup>

        {/* Create */}
        <CommandGroup heading={t('command_palette.group.create')}>
          {createItems.map((item) => (
            <CommandItem
              key={item.action}
              value={`create ${item.name}`}
              onSelect={() => handleCreate(item.action)}
            >
              <Plus className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Theme */}
        <CommandGroup heading={t('command_palette.group.theme')}>
          {themeItems.map((item) => (
            <CommandItem
              key={item.value}
              value={`theme ${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => handleTheme(item.value)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Search/Ask - show at bottom when there IS a command match */}
        {query.trim() && hasCommandMatch && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('command_palette.group.search_ask_alt')} forceMount>
              <CommandItem
                value={`__search__ ${query}`}
                onSelect={handleSearch}
                forceMount
              >
                <Search className="h-4 w-4" />
                <span>{t('command_palette.search_for', { query })}</span>
              </CommandItem>
              <CommandItem
                value={`__ask__ ${query}`}
                onSelect={handleAsk}
                forceMount
              >
                <MessageCircleQuestion className="h-4 w-4" />
                <span>{t('command_palette.ask_about', { query })}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
