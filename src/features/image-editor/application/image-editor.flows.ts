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
  aspectRatio: AspectRatio
  selectedImages: string[]
  generateImages: ImageEditorServices["generateImages"]
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
    remainingCredits:
      typeof response.remainingCredits === "number"
        ? response.remainingCredits
        : null,
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
