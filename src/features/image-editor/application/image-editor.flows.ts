import {
  clampGenerateCount,
  generatedIdFromIndex,
  generatedIdToSlotIndex,
} from "@/features/image-editor/domain/image-editor.utils"
import type {
  AspectRatio,
  GalleryItem,
  GeneratedSlot,
} from "@/features/image-editor/domain/image-editor.types"

export type GenerateImagesPayload = {
  prompt: string
  count: number
  mock: boolean
  goFast: boolean
  megapixels: "1"
  aspectRatio: AspectRatio
  inputImagesDataUrlsOrUrls: string[]
  outputFormat: "jpg"
  outputQuality: number
}

export type ImageEditorServices = {
  generateImages: (payload: GenerateImagesPayload) => Promise<{
    images: string[]
    chargedCredits: number
    remainingCredits: number
  }>
  upscaleImage: (payload: { image: string }) => Promise<{
    image?: string | null
    chargedCredits: number
    remainingCredits: number
  }>
  downloadImage: (payload: { imageUrl: string }) => Promise<{
    base64: string
    contentType?: string | null
  }>
}

export type ImageEditorHelpers = {
  fileToDataUrl: (file: File) => Promise<string>
  base64ToBlob: (base64: string, contentType?: string) => Blob
}

type ExecuteGenerateFlowOptions = {
  prompt: string
  generateCount: number
  isDev: boolean
  isMockEnabled: boolean
  autoUpscale4k?: boolean
  aspectRatio: AspectRatio
  selectedImages: string[]
  generateImages: ImageEditorServices["generateImages"]
  upscaleImage?: ImageEditorServices["upscaleImage"]
  onImageGenerated?: (generated: {
    index: number
    imageUrl: string
    remainingCredits: number | null
  }) => void
  onImageUpscaled?: (upscaled: {
    index: number
    upscaledImageUrl: string
    remainingCredits: number | null
  }) => void
}

type ExecuteGenerateFlowResult = {
  generatedSlots: GeneratedSlot[]
  selectedId: string
  remainingCredits: number | null
  payload: GenerateImagesPayload
}

export async function executeGenerateFlow({
  prompt,
  generateCount,
  isDev,
  isMockEnabled,
  autoUpscale4k = false,
  aspectRatio,
  selectedImages,
  generateImages,
  upscaleImage,
  onImageGenerated,
  onImageUpscaled,
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

  const generated: string[] = []
  const upscaled = new Map<number, string>()
  let remainingCredits: number | null = null

  for (let index = 0; index < safeCount; index += 1) {
    const response = await generateImages({
      ...payload,
      count: 1,
    })

    if (!Array.isArray(response.images) || response.images.length === 0) {
      throw new Error("No generated images returned")
    }

    const imageUrl = response.images[0]
    if (!imageUrl) {
      throw new Error(`Missing generated image for slot ${index + 1}`)
    }

    generated.push(imageUrl)
    remainingCredits =
      typeof response.remainingCredits === "number"
        ? response.remainingCredits
        : remainingCredits

    onImageGenerated?.({
      index,
      imageUrl,
      remainingCredits,
    })

    if (autoUpscale4k) {
      if (!upscaleImage) {
        throw new Error("Upscale service is unavailable")
      }

      const upscaleResponse = await upscaleImage({
        image: imageUrl,
      })

      const upscaledImageUrl = upscaleResponse.image?.trim()
      if (!upscaledImageUrl) {
        throw new Error(`Missing upscaled image for slot ${index + 1}`)
      }

      upscaled.set(index, upscaledImageUrl)
      remainingCredits =
        typeof upscaleResponse.remainingCredits === "number"
          ? upscaleResponse.remainingCredits
          : remainingCredits

      onImageUpscaled?.({
        index,
        upscaledImageUrl,
        remainingCredits,
      })
    }
  }

  return {
    generatedSlots: generated.map((imageUrl, index) => ({
      generatedSrc: imageUrl,
      upscaledSrc: upscaled.get(index) ?? null,
    })),
    selectedId: generatedIdFromIndex(0),
    remainingCredits,
    payload,
  }
}

type ExecuteUpscaleFlowOptions = {
  selectedImage: GalleryItem | undefined
  generatedSlots: GeneratedSlot[]
  upscaleImage: ImageEditorServices["upscaleImage"]
}

type ExecuteUpscaleFlowResult = {
  generatedSlots: GeneratedSlot[]
  selectedId: string
  remainingCredits: number | null
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
    remainingCredits:
      typeof response.remainingCredits === "number"
        ? response.remainingCredits
        : null,
  }
}

type ExecuteDownloadFlowOptions = {
  imageUrl: string
  filename: string
  downloadImage: ImageEditorServices["downloadImage"]
  base64ToBlob: ImageEditorHelpers["base64ToBlob"]
}

export function isCreditsErrorMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  return (
    lowerMessage.includes("insufficient credits") ||
    lowerMessage.includes("credits error")
  )
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
