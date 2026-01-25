'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { FieldErrorsImpl } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'

import { SpeakerProfile } from '@/lib/types/podcasts'
import {
  useCreateSpeakerProfile,
  useUpdateSpeakerProfile,
} from '@/lib/hooks/use-podcasts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useT } from '@/i18n'

const speakerConfigSchema = (
  t: (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string
) => z.object({
  name: z.string().min(1, t('podcasts.speaker_profile.validation.speaker.name_required')),
  voice_id: z.string().min(1, t('podcasts.speaker_profile.validation.speaker.voice_id_required')),
  backstory: z.string().min(1, t('podcasts.speaker_profile.validation.speaker.backstory_required')),
  personality: z.string().min(1, t('podcasts.speaker_profile.validation.speaker.personality_required')),
})

const speakerProfileSchema = (
  t: (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string
) => z.object({
  name: z.string().min(1, t('podcasts.speaker_profile.validation.name_required')),
  description: z.string().optional(),
  tts_provider: z.string().min(1, t('podcasts.speaker_profile.validation.provider_required')),
  tts_model: z.string().min(1, t('podcasts.speaker_profile.validation.model_required')),
  speakers: z
    .array(speakerConfigSchema(t))
    .min(1, t('podcasts.speaker_profile.validation.speakers_min'))
    .max(4, t('podcasts.speaker_profile.validation.speakers_max')),
})

export type SpeakerProfileFormValues = z.infer<ReturnType<typeof speakerProfileSchema>>

interface SpeakerProfileFormDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  modelOptions: Record<string, string[]>
  initialData?: SpeakerProfile
}

const EMPTY_SPEAKER = {
  name: '',
  voice_id: '',
  backstory: '',
  personality: '',
}

export function SpeakerProfileFormDialog({
  mode,
  open,
  onOpenChange,
  modelOptions,
  initialData,
}: SpeakerProfileFormDialogProps) {
  const { t } = useT()
  const createProfile = useCreateSpeakerProfile()
  const updateProfile = useUpdateSpeakerProfile()

  const providers = useMemo(() => Object.keys(modelOptions), [modelOptions])

  const getDefaults = useCallback((): SpeakerProfileFormValues => {
    const firstProvider = providers[0] ?? ''
    const firstModel = firstProvider ? modelOptions[firstProvider]?.[0] ?? '' : ''

    if (initialData) {
      return {
        name: initialData.name,
        description: initialData.description ?? '',
        tts_provider: initialData.tts_provider,
        tts_model: initialData.tts_model,
        speakers: initialData.speakers?.map((speaker) => ({ ...speaker })) ?? [{ ...EMPTY_SPEAKER }],
      }
    }

    return {
      name: '',
      description: '',
      tts_provider: firstProvider,
      tts_model: firstModel,
      speakers: [{ ...EMPTY_SPEAKER }],
    }
  }, [initialData, modelOptions, providers])

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SpeakerProfileFormValues>({
    resolver: zodResolver(speakerProfileSchema(t)),
    defaultValues: getDefaults(),
  })

  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'speakers',
  })

  const provider = watch('tts_provider')
  const currentModel = watch('tts_model')
  const availableModels = useMemo(
    () => modelOptions[provider] ?? [],
    [modelOptions, provider]
  )

  const speakersArrayError = (
    errors.speakers as FieldErrorsImpl<{ root?: { message?: string } }> | undefined
  )?.root?.message

  useEffect(() => {
    if (!open) {
      return
    }
    reset(getDefaults())
  }, [open, reset, getDefaults])

  useEffect(() => {
    if (!provider) {
      return
    }
    const models = modelOptions[provider] ?? []
    if (models.length === 0) {
      setValue('tts_model', '')
      return
    }
    if (!models.includes(currentModel)) {
      setValue('tts_model', models[0])
    }
  }, [provider, currentModel, modelOptions, setValue])

  const onSubmit = async (values: SpeakerProfileFormValues) => {
    const payload = {
      ...values,
      description: values.description ?? '',
    }

    if (mode === 'create') {
      await createProfile.mutateAsync(payload)
    } else if (initialData) {
      await updateProfile.mutateAsync({
        profileId: initialData.id,
        payload,
      })
    }

    onOpenChange(false)
  }

  const isSubmitting = createProfile.isPending || updateProfile.isPending
  const disableSubmit = isSubmitting || providers.length === 0
  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('podcasts.speaker_profile.edit_title') : t('podcasts.speaker_profile.create_title')}
          </DialogTitle>
          <DialogDescription>
            {t('podcasts.speaker_profile.desc')}
          </DialogDescription>
        </DialogHeader>

        {providers.length === 0 ? (
          <Alert className="bg-amber-50 text-amber-900">
            <AlertTitle>{t('podcasts.speaker_profile.no_tts.title')}</AlertTitle>
            <AlertDescription>
              {t('podcasts.speaker_profile.no_tts.desc')}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('podcasts.speaker_profile.name.label')}</Label>
              <Input id="name" placeholder={t('podcasts.speaker_profile.name.placeholder')} {...register('name')} />
              {errors.name ? (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts_provider">{t('podcasts.speaker_profile.provider.label')}</Label>
              <Controller
                control={control}
                name="tts_provider"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('podcasts.speaker_profile.provider.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((option) => (
                        <SelectItem key={option} value={option}>
                          <span className="capitalize">{option}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tts_provider ? (
                <p className="text-xs text-red-600">{errors.tts_provider.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts_model">{t('podcasts.speaker_profile.model.label')}</Label>
              <Controller
                control={control}
                name="tts_model"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('podcasts.speaker_profile.model.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tts_model ? (
                <p className="text-xs text-red-600">{errors.tts_model.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder={t('podcasts.speaker_profile.description.placeholder')}
                {...register('description')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('podcasts.speaker_profile.speakers.title')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('podcasts.speaker_profile.speakers.desc')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...EMPTY_SPEAKER })}
                disabled={fields.length >= 4}
              >
                <Plus className="mr-2 h-4 w-4" /> {t('podcasts.speaker_profile.speakers.add')}
              </Button>
            </div>
            <Separator />

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t('podcasts.speaker_profile.speakers.speaker_n', { n: index + 1 })}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {t('common.remove')}
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('podcasts.speaker_profile.speaker.name')}</Label>
                    <Input
                      {...register(`speakers.${index}.name` as const)}
                      placeholder={t('podcasts.speaker_profile.speaker.name_placeholder')}
                    />
                    {errors.speakers?.[index]?.name ? (
                      <p className="text-xs text-red-600">
                        {errors.speakers[index]?.name?.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('podcasts.speaker_profile.speaker.voice_id')}</Label>
                    <Input
                      {...register(`speakers.${index}.voice_id` as const)}
                      placeholder={t('podcasts.speaker_profile.speaker.voice_id_placeholder')}
                    />
                    {errors.speakers?.[index]?.voice_id ? (
                      <p className="text-xs text-red-600">
                        {errors.speakers[index]?.voice_id?.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('podcasts.speaker_profile.speaker.backstory')}</Label>
                  <Textarea
                    rows={3}
                    placeholder={t('podcasts.speaker_profile.speaker.backstory_placeholder')}
                    {...register(`speakers.${index}.backstory` as const)}
                  />
                  {errors.speakers?.[index]?.backstory ? (
                    <p className="text-xs text-red-600">
                      {errors.speakers[index]?.backstory?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>{t('podcasts.speaker_profile.speaker.personality')}</Label>
                  <Textarea
                    rows={3}
                    placeholder={t('podcasts.speaker_profile.speaker.personality_placeholder')}
                    {...register(`speakers.${index}.personality` as const)}
                  />
                  {errors.speakers?.[index]?.personality ? (
                    <p className="text-xs text-red-600">
                      {errors.speakers[index]?.personality?.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {speakersArrayError ? (
              <p className="text-xs text-red-600">{speakersArrayError}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={disableSubmit}>
              {isSubmitting
                ? isEdit
                  ? t('common.saving')
                  : t('common.creating')
                : isEdit
                  ? t('common.save_changes')
                  : t('podcasts.speaker_profile.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
