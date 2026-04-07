import type { GenerateReplicateImagePayload } from "../../../trigger/generate-ai-image"

export type AspectRatio = NonNullable<
  GenerateReplicateImagePayload["aspectRatio"]
>

export type GalleryItem = {
  id: string
  label: string
  status: "preview" | "loading" | "ready" | "error"
  src?: string
  isUpscaled?: boolean
}

export type GeneratedSlot = {
  generatedSrc: string | null
  upscaledSrc: string | null
}

export type SelectedImageSlot = {
  previewUrl: string
  inputSource: string
}

export const MAX_SLOTS = 3
export const MAX_GENERATE_COUNT = 4

export const GENERATE_COUNT_OPTIONS = Array.from(
  { length: MAX_GENERATE_COUNT },
  (_, i) => i + 1
)

export const ASPECT_RATIO_OPTIONS: Array<AspectRatio> = [
  "1:1",
  "16:9",
  "9:16",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "5:4",
  "4:5",
  "21:9",
  "9:21",
]

export function clampGenerateCount(generateCount: number): number {
  return Math.min(Math.max(generateCount || 1, 1), MAX_GENERATE_COUNT)
}

export function generatedIdFromIndex(index: number): string {
  return `generated-${index + 1}`
}

export function generatedIdToSlotIndex(id: string): number | null {
  const selectedIndex = Number.parseInt(id.replace("generated-", ""), 10)
  const slotIndex = selectedIndex - 1

  if (!Number.isFinite(slotIndex) || slotIndex < 0) {
    return null
  }

  return slotIndex
}

export function parseAspectRatioDimensions(aspectRatio: string): {
  width: number
  height: number
} {
  const [ratioWidth, ratioHeight] = aspectRatio
    .split(":")
    .map((value) => Number.parseInt(value, 10))

  const safeRatioWidth = Number.isFinite(ratioWidth) ? ratioWidth : 1
  const safeRatioHeight = Number.isFinite(ratioHeight) ? ratioHeight : 1

  return {
    width: safeRatioWidth,
    height: safeRatioHeight,
  }
}

export function calculateAspectRatioValue(aspectRatio: string): number {
  const [width, height] = aspectRatio
    .split(":")
    .map((value) => Number.parseInt(value, 10))

  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1

  return safeWidth / safeHeight
}

export function createEmptyGeneratedSlots(count: number): Array<GeneratedSlot> {
  return Array.from({ length: count }, () => ({
    generatedSrc: null,
    upscaledSrc: null,
  }))
}

export function createPreviewImageDataUrl(aspectRatio: AspectRatio): string {
  const { width, height } = parseAspectRatioDimensions(aspectRatio)
  const previewWidth = 2000
  const previewHeight = Math.max(1, Math.round((previewWidth * height) / width))
  const text = encodeURIComponent("Preview\nImage")

  return `https://placehold.co/${previewWidth}x${previewHeight}?text=${text}`
}

export function createPreviewGalleryItems(
  generateCount: number,
  aspectRatio: AspectRatio
): Array<GalleryItem> {
  const safeCount = clampGenerateCount(generateCount)

  return Array.from({ length: safeCount }, (_, index) => ({
    id: generatedIdFromIndex(index),
    src: createPreviewImageDataUrl(aspectRatio),
    label: `Result ${index + 1}`,
    status: "preview",
  }))
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("Failed to read selected image"))
    }
    reader.onerror = () => reject(new Error("Failed to read selected image"))
    reader.readAsDataURL(file)
  })
}

export function base64ToBlob(base64: string, contentType?: string): Blob {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)

  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i)
  }

  return new Blob([bytes], {
    type: contentType || "application/octet-stream",
  })
}

export function withInputSlot(
  slots: Array<SelectedImageSlot | null>,
  index: number,
  inputSource: string
): Array<SelectedImageSlot | null> {
  const next = [...slots]
  next[index] = {
    previewUrl: inputSource,
    inputSource,
  }
  return next
}
