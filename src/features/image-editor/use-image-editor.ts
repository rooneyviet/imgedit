import { useCallback, useMemo, useState } from "react"

import {
  ASPECT_RATIO_OPTIONS,
  MAX_SLOTS,
  base64ToBlob,
  calculateAspectRatioValue,
  clampGenerateCount,
  createEmptyGeneratedSlots,
  createPreviewGalleryItems,
  fileToDataUrl,
  generatedIdFromIndex,
  generatedIdToSlotIndex,
  withInputSlot,
} from "./helpers"
import type {
  AspectRatio,
  GalleryItem,
  GeneratedSlot,
  SelectedImageSlot,
} from "./helpers"

export type GenerateImagesPayload = {
  prompt: string
  count: number
  mock: boolean
  goFast: boolean
  megapixels: "1"
  aspectRatio: AspectRatio
  inputImagesDataUrlsOrUrls: Array<string>
  outputFormat: "jpg"
  outputQuality: number
}

export type ImageEditorServices = {
  generateImages: (payload: GenerateImagesPayload) => Promise<{
    images: Array<string>
  }>
  upscaleImage: (payload: { image: string }) => Promise<{ image?: string | null }>
  downloadImage: (payload: { imageUrl: string }) => Promise<{
    base64: string
    contentType?: string | null
  }>
}

export type ImageEditorHelpers = {
  fileToDataUrl: (file: File) => Promise<string>
  base64ToBlob: (base64: string, contentType?: string) => Blob
}

type UseImageEditorOptions = {
  isDev: boolean
  services: ImageEditorServices
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
  generatedSlots: Array<GeneratedSlot>
  isGenerating: boolean
  isDownloading: boolean
  isUpscaling: boolean
  downloadError: string | null
  generateError: string | null
  upscaleError: string | null
  slots: Array<SelectedImageSlot | null>
  selectedImages: Array<string>
  generatedImages: Array<GalleryItem>
  selectedId: string | null
  selectedImage: GalleryItem
  selectedGeneratedSlot: GeneratedSlot | null
  selectedAspectRatio: number
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

type ExecuteGenerateFlowOptions = {
  prompt: string
  generateCount: number
  isDev: boolean
  isMockEnabled: boolean
  aspectRatio: AspectRatio
  selectedImages: Array<string>
  generateImages: ImageEditorServices["generateImages"]
}

type ExecuteGenerateFlowResult = {
  generatedSlots: Array<GeneratedSlot>
  selectedId: string
  payload: GenerateImagesPayload
}

export async function executeGenerateFlow({
  prompt,
  generateCount,
  isDev,
  isMockEnabled,
  aspectRatio,
  selectedImages,
  generateImages,
}: ExecuteGenerateFlowOptions): Promise<ExecuteGenerateFlowResult> {
  if (selectedImages.length === 0) {
    throw new Error("Please select at least one input image")
  }

  const safeCount = clampGenerateCount(generateCount)
  const payload: GenerateImagesPayload = {
    prompt: prompt.trim() || "Edit this image with the reference subjects",
    count: safeCount,
    mock: isDev && isMockEnabled,
    goFast: true,
    megapixels: "1",
    aspectRatio,
    inputImagesDataUrlsOrUrls: selectedImages,
    outputFormat: "jpg",
    outputQuality: 95,
  }

  const response = await generateImages(payload)
  if (!Array.isArray(response.images) || response.images.length === 0) {
    throw new Error("No generated images returned")
  }

  const generated = Array.from({ length: safeCount }, (_, index) => {
    const imageUrl = response.images[index]
    if (!imageUrl) {
      throw new Error(`Missing generated image for slot ${index + 1}`)
    }

    return imageUrl
  })

  return {
    generatedSlots: generated.map((imageUrl) => ({
      generatedSrc: imageUrl,
      upscaledSrc: null,
    })),
    selectedId: generatedIdFromIndex(0),
    payload,
  }
}

type ExecuteUpscaleFlowOptions = {
  selectedImage: GalleryItem | undefined
  generatedSlots: Array<GeneratedSlot>
  upscaleImage: ImageEditorServices["upscaleImage"]
}

type ExecuteUpscaleFlowResult = {
  generatedSlots: Array<GeneratedSlot>
  selectedId: string
}

export async function executeUpscaleFlow({
  selectedImage,
  generatedSlots,
  upscaleImage,
}: ExecuteUpscaleFlowOptions): Promise<ExecuteUpscaleFlowResult> {
  if (
    !selectedImage?.src ||
    selectedImage.status !== "ready" ||
    selectedImage.isUpscaled
  ) {
    throw new Error("Selected image is not eligible for upscaling")
  }

  const response = await upscaleImage({
    image: selectedImage.src,
  })
  const image = response.image?.trim()
  if (!image) {
    throw new Error("Upscale did not return an image")
  }

  const slotIndex = generatedIdToSlotIndex(selectedImage.id)
  if (slotIndex === null) {
    throw new Error("Unable to determine generated image slot")
  }

  return {
    generatedSlots: generatedSlots.map((slot, index) =>
      index === slotIndex
        ? {
            ...slot,
            upscaledSrc: image,
          }
        : slot
    ),
    selectedId: selectedImage.id,
  }
}

type ExecuteDownloadFlowOptions = {
  imageUrl: string
  filename: string
  downloadImage: ImageEditorServices["downloadImage"]
  base64ToBlob: ImageEditorHelpers["base64ToBlob"]
}

export async function executeDownloadFlow({
  imageUrl,
  filename,
  downloadImage,
  base64ToBlob: toBlob,
}: ExecuteDownloadFlowOptions): Promise<void> {
  const response = await downloadImage({ imageUrl })
  const blob = toBlob(response.base64, response.contentType || undefined)
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

export function useImageEditor({
  isDev,
  services,
  canGenerate,
  onGenerateUnauthorized,
  helpers,
}: UseImageEditorOptions): ImageEditorController {
  const resolvedFileToDataUrl = helpers?.fileToDataUrl ?? fileToDataUrl
  const resolvedBase64ToBlob = helpers?.base64ToBlob ?? base64ToBlob

  const [prompt, setPrompt] = useState("")
  const [generateCount, setGenerateCount] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO)
  const [isMockEnabled, setIsMockEnabled] = useState(false)
  const [generatedSlots, setGeneratedSlots] = useState<Array<GeneratedSlot>>([])
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

  const generatedImages = useMemo<Array<GalleryItem>>(() => {
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
    () =>
      generatedImages.find((item) => item.id === selectedId) ??
      generatedImages[0],
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
    setSlots((prev) => withInputSlot(prev, index, inputSource))
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
    setSlots((prev) => {
      const next = [...prev]
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed"
      if (message === "Please sign in to continue") {
        setGeneratedSlots([])
        setSelectedId(null)
        onGenerateUnauthorized?.()
      }
      setGenerateError(message)
    } finally {
      setIsGenerating(false)
    }
  }, [
    aspectRatio,
    generateCount,
    isDev,
    isMockEnabled,
    canGenerate,
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

    try {
      const result = await executeUpscaleFlow({
        selectedImage,
        generatedSlots,
        upscaleImage: services.upscaleImage,
      })

      setGeneratedSlots(result.generatedSlots)
      setSelectedId(result.selectedId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image upscale failed"
      setUpscaleError(message)
    } finally {
      setIsUpscaling(false)
    }
  }, [generatedSlots, selectedImage, services])

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
        const message =
          error instanceof Error ? error.message : "Image download failed"
        setDownloadError(message)
      } finally {
        setIsDownloading(false)
      }
    },
    [resolvedBase64ToBlob, services]
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
