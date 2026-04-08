import {
  MAX_GENERATE_COUNT,
  type AspectRatio,
  type GalleryItem,
  type GeneratedSlot,
  type SelectedImageSlot,
} from "./image-editor.types"

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

export function createEmptyGeneratedSlots(count: number): GeneratedSlot[] {
  return Array.from({ length: count }, () => ({
    generatedSrc: null,
    upscaledSrc: null,
  }))
}

export function createPreviewImageDataUrl(aspectRatio: AspectRatio): string {
  const { width, height } = parseAspectRatioDimensions(aspectRatio)
  const previewWidth = 1600
  const previewHeight = Math.max(1, Math.round((previewWidth * height) / width))

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${previewWidth} ${previewHeight}'><rect width='100%' height='100%' fill='#e5e7eb' /><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-family='monospace' font-size='54'>Preview Image</text></svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function createPreviewGalleryItems(
  generateCount: number,
  aspectRatio: AspectRatio
): GalleryItem[] {
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

    reader.onerror = () => {
      reject(new Error("Failed to read selected image"))
    }

    reader.readAsDataURL(file)
  })
}

export function base64ToBlob(base64: string, contentType?: string): Blob {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)

  for (let index = 0; index < byteString.length; index++) {
    bytes[index] = byteString.charCodeAt(index)
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
