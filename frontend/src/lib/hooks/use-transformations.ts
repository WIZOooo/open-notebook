import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transformationsApi } from '@/lib/api/transformations'
import { useToast } from '@/lib/hooks/use-toast'
import { t as translate } from '@/i18n'
import { useLanguageStore } from '@/lib/stores/language-store'
import {
  CreateTransformationRequest,
  UpdateTransformationRequest,
  ExecuteTransformationRequest
} from '@/lib/types/transformations'

// Add to QUERY_KEYS in query-client.ts
export const TRANSFORMATION_QUERY_KEYS = {
  transformations: ['transformations'] as const,
  transformation: (id: string) => ['transformations', id] as const,
  defaultPrompt: ['transformations', 'default-prompt'] as const,
}

export function useTransformations() {
  return useQuery({
    queryKey: TRANSFORMATION_QUERY_KEYS.transformations,
    queryFn: () => transformationsApi.list(),
  })
}

export function useTransformation(id?: string, options?: { enabled?: boolean }) {
  const transformationId = id ?? ''
  return useQuery({
    queryKey: TRANSFORMATION_QUERY_KEYS.transformation(transformationId),
    queryFn: () => transformationsApi.get(transformationId),
    enabled: !!transformationId && (options?.enabled ?? true),
  })
}

export function useCreateTransformation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateTransformationRequest) => transformationsApi.create(data),
    onSuccess: () => {
      const language = useLanguageStore.getState().language
      queryClient.invalidateQueries({ queryKey: TRANSFORMATION_QUERY_KEYS.transformations })
      toast({
        title: translate(language, 'toast.success'),
        description: translate(language, 'transformations.toast.created'),
      })
    },
    onError: () => {
      const language = useLanguageStore.getState().language
      toast({
        title: translate(language, 'toast.error'),
        description: translate(language, 'transformations.toast.create_failed'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateTransformation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransformationRequest }) =>
      transformationsApi.update(id, data),
    onSuccess: (_, { id, data }) => {
      const language = useLanguageStore.getState().language
      queryClient.invalidateQueries({ queryKey: TRANSFORMATION_QUERY_KEYS.transformations })
      queryClient.invalidateQueries({ queryKey: TRANSFORMATION_QUERY_KEYS.transformation(id) })
      toast({
        title: translate(language, 'toast.success'),
        description: translate(language, 'transformations.toast.saved', {
          name: data.name || translate(language, 'transformations.toast.fallback_name'),
        }),
      })
    },
    onError: () => {
      const language = useLanguageStore.getState().language
      toast({
        title: translate(language, 'toast.error'),
        description: translate(language, 'transformations.toast.save_failed'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteTransformation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => transformationsApi.delete(id),
    onSuccess: () => {
      const language = useLanguageStore.getState().language
      queryClient.invalidateQueries({ queryKey: TRANSFORMATION_QUERY_KEYS.transformations })
      toast({
        title: translate(language, 'toast.success'),
        description: translate(language, 'transformations.toast.deleted'),
      })
    },
    onError: () => {
      const language = useLanguageStore.getState().language
      toast({
        title: translate(language, 'toast.error'),
        description: translate(language, 'transformations.toast.delete_failed'),
        variant: 'destructive',
      })
    },
  })
}

export function useExecuteTransformation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: ExecuteTransformationRequest) => transformationsApi.execute(data),
    onError: () => {
      const language = useLanguageStore.getState().language
      toast({
        title: translate(language, 'toast.error'),
        description: translate(language, 'transformations.toast.execute_failed'),
        variant: 'destructive',
      })
    },
  })
}

export function useDefaultPrompt() {
  return useQuery({
    queryKey: TRANSFORMATION_QUERY_KEYS.defaultPrompt,
    queryFn: () => transformationsApi.getDefaultPrompt(),
  })
}

export function useUpdateDefaultPrompt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (prompt: { transformation_instructions: string }) => transformationsApi.updateDefaultPrompt(prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSFORMATION_QUERY_KEYS.defaultPrompt })
      toast({
        title: 'Success',
        description: 'Default prompt saved successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update default prompt',
        variant: 'destructive',
      })
    },
  })
}
