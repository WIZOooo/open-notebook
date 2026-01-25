"use client"

import { FormSection } from "@/components/ui/form-section"
import { CheckboxList } from "@/components/ui/checkbox-list"
import { NotebookResponse } from "@/lib/types/api"
import { useT } from "@/i18n"

interface NotebooksStepProps {
  notebooks: NotebookResponse[]
  selectedNotebooks: string[]
  onToggleNotebook: (notebookId: string) => void
  loading?: boolean
}

export function NotebooksStep({
  notebooks,
  selectedNotebooks,
  onToggleNotebook,
  loading = false
}: NotebooksStepProps) {
  const { t } = useT()
  const notebookItems = notebooks.map((notebook) => ({
    id: notebook.id,
    title: notebook.name,
    description: notebook.description || undefined
  }))

  return (
    <div className="space-y-6">
      <FormSection
        title={t("sources.add.notebooks.title")}
        description={t("sources.add.notebooks.desc")}
      >
        <CheckboxList
          items={notebookItems}
          selectedIds={selectedNotebooks}
          onToggle={onToggleNotebook}
          loading={loading}
          emptyMessage={t("sources.add.notebooks.empty")}
        />
      </FormSection>
    </div>
  )
}
