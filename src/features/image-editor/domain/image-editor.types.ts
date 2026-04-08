import type { GenerateReplicateImagePayload } from "../../../../trigger/generate-ai-image"

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
  (_, index) => index + 1
)

export const ASPECT_RATIO_OPTIONS: AspectRatio[] = [
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
