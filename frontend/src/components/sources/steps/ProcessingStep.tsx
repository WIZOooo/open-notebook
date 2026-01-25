"use client"

import { Control, Controller } from "react-hook-form"
import { FormSection } from "@/components/ui/form-section"
import { CheckboxList } from "@/components/ui/checkbox-list"
import { Checkbox } from "@/components/ui/checkbox"
import { Transformation } from "@/lib/types/transformations"
import { SettingsResponse } from "@/lib/types/api"
import { useT } from "@/i18n"

interface CreateSourceFormData {
  type: 'link' | 'upload' | 'text'
  title?: string
  url?: string
  content?: string
  file?: FileList | File
  notebooks?: string[]
  transformations?: string[]
  embed: boolean
  async_processing: boolean
}

interface ProcessingStepProps {
  control: Control<CreateSourceFormData>
  transformations: Transformation[]
  selectedTransformations: string[]
  onToggleTransformation: (transformationId: string) => void
  loading?: boolean
  settings?: SettingsResponse
}

export function ProcessingStep({
  control,
  transformations,
  selectedTransformations,
  onToggleTransformation,
  loading = false,
  settings
}: ProcessingStepProps) {
  const { t } = useT()
  const transformationItems = transformations.map((transformation) => ({
    id: transformation.id,
    title: transformation.title,
    description: transformation.description
  }))

  return (
    <div className="space-y-8">
      <FormSection
        title={t("sources.add.processing.transformations.title")}
        description={t("sources.add.processing.transformations.desc")}
      >
        <CheckboxList
          items={transformationItems}
          selectedIds={selectedTransformations}
          onToggle={onToggleTransformation}
          loading={loading}
          emptyMessage={t("sources.add.processing.transformations.empty")}
        />
      </FormSection>

      <FormSection
        title={t("sources.add.processing.settings.title")}
        description={t("sources.add.processing.settings.desc")}
      >
        <div className="space-y-4">
          {settings?.default_embedding_option === 'ask' && (
            <Controller
              control={control}
              name="embed"
              render={({ field }) => (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md hover:bg-muted">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium block">{t("sources.add.processing.embed.ask.title")}</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("sources.add.processing.embed.ask.desc")}
                    </p>
                  </div>
                </label>
              )}
            />
          )}

          {settings?.default_embedding_option === 'always' && (
            <div className="p-3 rounded-md bg-primary/10 border border-primary/30">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-primary rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium block text-primary">{t("sources.add.processing.embed.always.title")}</span>
                  <p className="text-xs text-primary mt-1">
                    {t("sources.add.processing.embed.always.desc")}{" "}
                    <span className="font-medium">{t("sidebar.nav.settings")}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings?.default_embedding_option === 'never' && (
            <div className="p-3 rounded-md bg-muted border border-border">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-muted-foreground rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium block text-foreground">{t("sources.add.processing.embed.never.title")}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("sources.add.processing.embed.never.desc")}{" "}
                    <span className="font-medium">{t("sidebar.nav.settings")}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  )
}
