'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { useCreateTransformation, useUpdateTransformation, useTransformation } from '@/lib/hooks/use-transformations'
import { Transformation } from '@/lib/types/transformations'
import { useQueryClient } from '@tanstack/react-query'
import { TRANSFORMATION_QUERY_KEYS } from '@/lib/hooks/use-transformations'
import { useT } from '@/i18n'

const transformationSchema = (t: (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string) => z.object({
  name: z.string().min(1, t('transformations.editor.validation.name_required')),
  title: z.string().optional(),
  description: z.string().optional(),
  prompt: z.string().min(1, t('transformations.editor.validation.prompt_required')),
  apply_default: z.boolean().optional(),
})

type TransformationFormData = z.infer<ReturnType<typeof transformationSchema>>

interface TransformationEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transformation?: Transformation
}

export function TransformationEditorDialog({ open, onOpenChange, transformation }: TransformationEditorDialogProps) {
  const { t } = useT()
  const isEditing = Boolean(transformation)
  const { data: fetchedTransformation, isLoading } = useTransformation(transformation?.id ?? '', {
    enabled: open && Boolean(transformation?.id),
  })
  const createTransformation = useCreateTransformation()
  const updateTransformation = useUpdateTransformation()
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransformationFormData>({
    resolver: zodResolver(transformationSchema(t)),
    defaultValues: {
      name: '',
      title: '',
      description: '',
      prompt: '',
      apply_default: false,
    },
  })

  useEffect(() => {
    if (!open) {
      reset({ name: '', title: '', description: '', prompt: '', apply_default: false })
      return
    }

    const source = fetchedTransformation ?? transformation
    reset({
      name: source?.name ?? '',
      title: source?.title ?? '',
      description: source?.description ?? '',
      prompt: source?.prompt ?? '',
      apply_default: source?.apply_default ?? false,
    })
  }, [open, transformation, fetchedTransformation, reset])

  const onSubmit = async (data: TransformationFormData) => {
    if (transformation) {
      await updateTransformation.mutateAsync({
        id: transformation.id,
        data: {
          name: data.name,
          title: data.title || undefined,
          description: data.description || undefined,
          prompt: data.prompt,
          apply_default: Boolean(data.apply_default),
        },
      })
      queryClient.invalidateQueries({ queryKey: TRANSFORMATION_QUERY_KEYS.transformation(transformation.id) })
    } else {
      await createTransformation.mutateAsync({
        name: data.name,
        title: data.title || data.name,
        description: data.description || '',
        prompt: data.prompt,
        apply_default: Boolean(data.apply_default),
      })
    }

    reset()
    onOpenChange(false)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const isSaving = transformation ? updateTransformation.isPending : createTransformation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {isEditing ? t('transformations.editor.edit_title') : t('transformations.editor.create_title')}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          {isEditing && isLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <span className="text-sm text-muted-foreground">{t('transformations.editor.loading')}</span>
            </div>
          ) : (
            <>
              <div className="border-b px-6 py-4 space-y-4">
                <div>
                  <Label htmlFor="transformation-name" className="text-sm font-medium">
                    {t('transformations.editor.name')}
                  </Label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Input
                        id="transformation-name"
                        {...field}
                        placeholder={t('transformations.editor.name_placeholder')}
                      />
                    )}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transformation-title" className="text-sm font-medium">
                      {t('transformations.editor.title')}
                    </Label>
                    <Controller
                      control={control}
                      name="title"
                      render={({ field }) => (
                        <Input
                          id="transformation-title"
                          {...field}
                          placeholder={t('transformations.editor.title_placeholder')}
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6 md:pt-8">
                    <Controller
                      control={control}
                      name="apply_default"
                      render={({ field }) => (
                        <Checkbox
                          id="transformation-default"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                      )}
                    />
                    <Label htmlFor="transformation-default" className="text-sm">
                      {t('transformations.editor.apply_default')}
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="transformation-description" className="text-sm font-medium">
                    {t('common.description')}
                  </Label>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <Textarea
                        id="transformation-description"
                        {...field}
                        placeholder={t('transformations.editor.description_placeholder')}
                        rows={2}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <Label className="text-sm font-medium">{t('transformations.editor.prompt')}</Label>
                <Controller
                  control={control}
                  name="prompt"
                  render={({ field }) => (
                    <MarkdownEditor
                      key={transformation?.id ?? 'new-transformation'}
                      value={field.value}
                      onChange={field.onChange}
                      height={420}
                      placeholder={t('transformations.editor.prompt_placeholder')}
                      className="rounded-md border"
                    />
                  )}
                />
                {errors.prompt && (
                  <p className="text-sm text-red-600 mt-1">{errors.prompt.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  {t('transformations.editor.prompt_hint')}
                </p>
              </div>
            </>
          )}

          <div className="border-t px-6 py-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || (isEditing && isLoading)}>
              {isSaving
                ? isEditing ? t('common.saving') : t('common.creating')
                : isEditing
                  ? t('transformations.editor.save')
                  : t('transformations.editor.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
