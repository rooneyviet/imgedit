import { useCallback, useMemo, useState } from "react"

import {
  executeDownloadFlow,
  executeGenerateFlow,
  executeUpscaleFlow,
  isCreditsErrorMessage,
  type ImageEditorHelpers,
  type ImageEditorServices,
} from "@/features/image-editor/application/image-editor.flows"
import {
  ASPECT_RATIO_OPTIONS,
  MAX_SLOTS,
  type AspectRatio,
  type GalleryItem,
  type GeneratedSlot,
  type SelectedImageSlot,
} from "@/features/image-editor/domain/image-editor.types"
import {
  base64ToBlob,
  calculateAspectRatioValue,
  clampGenerateCount,
  createEmptyGeneratedSlots,
  createPreviewGalleryItems,
  fileToDataUrl,
  generatedIdFromIndex,
  generatedIdToSlotIndex,
  withInputSlot,
} from "@/features/image-editor/domain/image-editor.utils"

export type UseImageEditorControllerOptions = {
  isDev: boolean
  services: ImageEditorServices
  normalImageCreditCost?: number
  upscale4kCreditCost?: number
  onCreditsUpdated?: (remainingCredits: number) => void
  canGenerate?: () => boolean
  onGenerateUnauthorized?: () => void
  helpers?: Partial<ImageEditorHelpers>
}

export type ImageEditorController = {
  isDev: boolean
  prompt: string
  generateCount: number
  aspectRatio: AspectRatio
  isMockEnabled: boolean
  generatedSlots: GeneratedSlot[]
  isGenerating: boolean
  isDownloading: boolean
  isUpscaling: boolean
  downloadError: string | null
  generateError: string | null
  upscaleError: string | null
  slots: Array<SelectedImageSlot | null>
  selectedImages: string[]
  generatedImages: GalleryItem[]
  selectedId: string | null
  selectedImage: GalleryItem
  selectedGeneratedSlot: GeneratedSlot | null
  selectedAspectRatio: number
  estimatedGenerateCredits: number
  upscale4kCreditCost: number
  isGenerateDisabled: boolean
  onPromptChange: (value: string) => void
  onGenerateCountChange: (count: number) => void
  onAspectRatioChange: (ratio: AspectRatio) => void
  onMockModeChange: (enabled: boolean) => void
  onSelectGeneratedImage: (id: string) => void
  onPickImage: (index: number, file?: File) => Promise<void>
  onRemoveImage: (index: number) => void
  onGenerate: () => Promise<void>
  onUpscale: () => Promise<void>
  onDownloadImage: (imageUrl: string, filename: string) => Promise<void>
  onUseGeneratedImageAsInput: (index: number) => void
}

const DEFAULT_ASPECT_RATIO = ASPECT_RATIO_OPTIONS[0]

export function useImageEditorController({
  isDev,
  services,
  normalImageCreditCost = 0,
  upscale4kCreditCost = 0,
  onCreditsUpdated,
  canGenerate,
  onGenerateUnauthorized,
  helpers,
}: UseImageEditorControllerOptions): ImageEditorController {
  const resolvedFileToDataUrl = helpers?.fileToDataUrl ?? fileToDataUrl
  const resolvedBase64ToBlob = helpers?.base64ToBlob ?? base64ToBlob

  const [prompt, setPrompt] = useState("")
  const [generateCount, setGenerateCount] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO)
  const [isMockEnabled, setIsMockEnabled] = useState(false)
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUpscaling, setIsUpscaling] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [upscaleError, setUpscaleError] = useState<string | null>(null)
  const [slots, setSlots] = useState<Array<SelectedImageSlot | null>>(
    Array.from({ length: MAX_SLOTS }, () => null)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedImages = useMemo(
    () => slots.flatMap((slot) => (slot ? [slot.inputSource] : [])),
    [slots]
  )

  const isGenerateDisabled =
    isGenerating || selectedImages.length === 0 || prompt.trim().length === 0

  const generatedImages = useMemo<GalleryItem[]>(() => {
    if (generatedSlots.length > 0) {
      return generatedSlots.map((slot, index) => {
        const src = slot.upscaledSrc ?? slot.generatedSrc ?? undefined

        return {
          id: generatedIdFromIndex(index),
          label: `Result ${index + 1}`,
          status: src ? "ready" : "loading",
          src,
          isUpscaled: Boolean(slot.upscaledSrc),
        }
      })
    }

    return createPreviewGalleryItems(generateCount, aspectRatio)
  }, [aspectRatio, generateCount, generatedSlots])

  const selectedImage = useMemo(
    () => generatedImages.find((item) => item.id === selectedId) ?? generatedImages[0],
    [generatedImages, selectedId]
  )

  const selectedGeneratedSlot = useMemo(() => {
    const slotIndex = generatedIdToSlotIndex(selectedImage.id)
    if (slotIndex === null) {
      return null
    }

    return generatedSlots[slotIndex] ?? null
  }, [generatedSlots, selectedImage])

  const selectedAspectRatio = useMemo(
    () => calculateAspectRatioValue(aspectRatio),
    [aspectRatio]
  )

  const estimatedGenerateCredits = useMemo(() => {
    const safeCount = clampGenerateCount(generateCount)
    const safeUnitCost = Math.max(0, Math.floor(normalImageCreditCost))

    return safeCount * safeUnitCost
  }, [generateCount, normalImageCreditCost])

  const onPromptChange = useCallback((value: string) => {
    setPrompt(value)
  }, [])

  const onGenerateCountChange = useCallback((count: number) => {
    setGenerateCount(count)
  }, [])

  const onAspectRatioChange = useCallback((ratio: AspectRatio) => {
    setAspectRatio(ratio)
  }, [])

  const onMockModeChange = useCallback((enabled: boolean) => {
    setIsMockEnabled(enabled)
  }, [])

  const onSelectGeneratedImage = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const setInputSlot = useCallback((index: number, inputSource: string) => {
    setSlots((previous) => withInputSlot(previous, index, inputSource))
  }, [])

  const onPickImage = useCallback(
    async (index: number, file?: File) => {
      if (!file) {
        return
      }

      const dataUrl = await resolvedFileToDataUrl(file)
      setInputSlot(index, dataUrl)
    },
    [resolvedFileToDataUrl, setInputSlot]
  )

  const onUseGeneratedImageAsInput = useCallback(
    (index: number) => {
      const generatedSrc = selectedGeneratedSlot?.generatedSrc
      if (!generatedSrc) {
        return
      }

      setInputSlot(index, generatedSrc)
    },
    [selectedGeneratedSlot, setInputSlot]
  )

  const onRemoveImage = useCallback((index: number) => {
    setSlots((previous) => {
      const next = [...previous]
      next[index] = null
      return next
    })
  }, [])

  const onGenerate = useCallback(async () => {
    if (canGenerate && !canGenerate()) {
      setGenerateError("Please sign in to continue")
      onGenerateUnauthorized?.()
      return
    }

    if (selectedImages.length === 0) {
      setGenerateError("Please select at least one input image")
      return
    }

    const safeCount = clampGenerateCount(generateCount)

    setIsGenerating(true)
    setDownloadError(null)
    setGenerateError(null)
    setUpscaleError(null)
    setGeneratedSlots(createEmptyGeneratedSlots(safeCount))
    setSelectedId(generatedIdFromIndex(0))

    try {
      const result = await executeGenerateFlow({
        prompt,
        generateCount: safeCount,
        isDev,
        isMockEnabled,
        aspectRatio,
        selectedImages,
        generateImages: services.generateImages,
      })

      setGeneratedSlots(result.generatedSlots)
      setSelectedId(result.selectedId)

      if (typeof result.remainingCredits === "number") {
        onCreditsUpdated?.(result.remainingCredits)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed"

      if (
        message === "Please sign in to continue" ||
        isCreditsErrorMessage(message)
      ) {
        setGeneratedSlots([])
        setSelectedId(null)

        if (message === "Please sign in to continue") {
          onGenerateUnauthorized?.()
        }
      }

      setGenerateError(message)
    } finally {
      setIsGenerating(false)
    }
  }, [
    aspectRatio,
    canGenerate,
    generateCount,
    isDev,
    isMockEnabled,
    onCreditsUpdated,
    onGenerateUnauthorized,
    prompt,
    selectedImages,
    services,
  ])

  const onUpscale = useCallback(async () => {
    if (
      !selectedImage.src ||
      selectedImage.status !== "ready" ||
      selectedImage.isUpscaled
    ) {
      return
    }

    setIsUpscaling(true)
    setDownloadError(null)
    setUpscaleError(null)
    setGenerateError(null)

    try {
      const result = await executeUpscaleFlow({
        selectedImage,
        generatedSlots,
        upscaleImage: services.upscaleImage,
      })

      setGeneratedSlots(result.generatedSlots)
      setSelectedId(result.selectedId)

      if (typeof result.remainingCredits === "number") {
        onCreditsUpdated?.(result.remainingCredits)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upscale failed"
      if (isCreditsErrorMessage(message)) {
        setGenerateError(message)
      } else {
        setUpscaleError(message)
      }
    } finally {
      setIsUpscaling(false)
    }
  }, [generatedSlots, onCreditsUpdated, selectedImage, services])

  const onDownloadImage = useCallback(
    async (imageUrl: string, filename: string) => {
      setIsDownloading(true)
      setDownloadError(null)

      try {
        await executeDownloadFlow({
          imageUrl,
          filename,
          downloadImage: services.downloadImage,
          base64ToBlob: resolvedBase64ToBlob,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image download failed"
        setDownloadError(message)
      } finally {
        setIsDownloading(false)
      }
    },
    [resolvedBase64ToBlob, services.downloadImage]
  )

  return {
    isDev,
    prompt,
    generateCount,
    aspectRatio,
    isMockEnabled,
    generatedSlots,
    isGenerating,
    isDownloading,
    isUpscaling,
    downloadError,
    generateError,
    upscaleError,
    slots,
    selectedImages,
    generatedImages,
    selectedId,
    selectedImage,
    selectedGeneratedSlot,
    selectedAspectRatio,
    estimatedGenerateCredits,
    upscale4kCreditCost,
    isGenerateDisabled,
    onPromptChange,
    onGenerateCountChange,
    onAspectRatioChange,
    onMockModeChange,
    onSelectGeneratedImage,
    onPickImage,
    onRemoveImage,
    onGenerate,
    onUpscale,
    onDownloadImage,
    onUseGeneratedImageAsInput,
  }
}
