'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CreateModelRequest, ProviderAvailability } from '@/lib/types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCreateModel } from '@/lib/hooks/use-models'
import { Plus } from 'lucide-react'
import { useT } from '@/i18n'

interface AddModelFormProps {
  modelType: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text'
  providers: ProviderAvailability
}

export function AddModelForm({ modelType, providers }: AddModelFormProps) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const createModel = useCreateModel()
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<CreateModelRequest>({
    defaultValues: {
      type: modelType
    }
  })

  // Get available providers that support this model type
  const availableProviders = providers.available.filter(provider =>
    providers.supported_types[provider]?.includes(modelType)
  )

  const onSubmit = async (data: CreateModelRequest) => {
    await createModel.mutateAsync(data)
    reset()
    setOpen(false)
  }

  const getModelTypeName = () => {
    switch (modelType) {
      case 'language':
        return t('models.type_name.language')
      case 'embedding':
        return t('models.type_name.embedding')
      case 'text_to_speech':
        return t('models.type_name.tts')
      case 'speech_to_text':
        return t('models.type_name.stt')
    }
  }

  const getModelPlaceholder = () => {
    switch (modelType) {
      case 'language':
        return t('models.add_model.placeholder.language')
      case 'embedding':
        return t('models.add_model.placeholder.embedding')
      case 'text_to_speech':
        return t('models.add_model.placeholder.tts')
      case 'speech_to_text':
        return t('models.add_model.placeholder.stt')
      default:
        return t('models.add_model.placeholder.fallback')
    }
  }

  if (availableProviders.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t('models.add_model.no_providers', { type: getModelTypeName() })}
      </div>
    )
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('models.add_model.open')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('models.add_model.title', { type: getModelTypeName() })}</DialogTitle>
          <DialogDescription>
            {t('models.add_model.desc', { type: getModelTypeName() })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="provider">{t('models.add_model.provider.label')}</Label>
            <Select onValueChange={(value) => setValue('provider', value)} required>
              <SelectTrigger>
                <SelectValue placeholder={t('models.add_model.provider.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    <span className="capitalize">{provider}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.provider && (
              <p className="text-sm text-destructive mt-1">{t('models.add_model.validation.provider_required')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="name">{t('models.add_model.name.label')}</Label>
            <Input
              id="name"
              {...register('name', { required: t('models.add_model.validation.name_required') })}
              placeholder={getModelPlaceholder()}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {modelType === 'language' && watch('provider') === 'azure' &&
                t('models.add_model.azure_hint')}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createModel.isPending}>
              {createModel.isPending ? t('models.add_model.adding') : t('models.add_model.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
