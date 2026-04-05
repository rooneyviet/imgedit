import { useCallback, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Download, ImagePlus, Upload, X } from "lucide-react"
import { useDropzone } from "react-dropzone"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { downloadAiImage } from "@/lib/server/download-ai-image"
import { generateAiImages } from "@/lib/server/generate-ai-images"
import { upscaleAiImage } from "@/lib/server/upscale-ai-image"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { GenerateReplicateImagePayload } from "../../trigger/generate-ai-image"

export const Route = createFileRoute("/")({ component: App })

type GalleryItem = {
  id: string
  label: string
  status: "preview" | "loading" | "ready" | "error"
  src?: string
  isUpscaled?: boolean
}

type GeneratedSlot = {
  generatedSrc: string | null
  upscaledSrc: string | null
}

type SelectedImageSlot = {
  previewUrl: string
  dataUrl: string
}

type InputImageSlotProps = {
  index: number
  slot: SelectedImageSlot | null
  isGenerating: boolean
  onPickImage: (index: number, file?: File) => Promise<void>
  onRemoveImage: (index: number) => void
}

type AspectRatio = NonNullable<GenerateReplicateImagePayload["aspectRatio"]>

const MAX_SLOTS = 3
const MAX_GENERATE_COUNT = 4
const GENERATE_COUNT_OPTIONS = Array.from(
  { length: MAX_GENERATE_COUNT },
  (_, i) => i + 1
)
const ASPECT_RATIO_OPTIONS: AspectRatio[] = [
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

function InputImageSlot({
  index,
  slot,
  isGenerating,
  onPickImage,
  onRemoveImage,
}: InputImageSlotProps) {
  const onDropAccepted = useCallback(
    (files: File[]) => {
      void onPickImage(index, files[0])
    },
    [index, onPickImage]
  )

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    maxFiles: 1,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDropAccepted,
  })

  return (
    <div {...getRootProps({ className: "relative" })}>
      <input {...getInputProps({ className: "hidden" })} />
      <Button
        type="button"
        variant="outline"
        onClick={open}
        className={cn(
          "relative aspect-square h-auto w-full overflow-hidden border-dashed p-0 transition-colors",
          isDragActive && "border-primary/60 bg-accent/20"
        )}
      >
        {slot ? (
          <img
            src={slot.previewUrl}
            alt={`Selected ${index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImagePlus size={16} />
            <span className="text-[10px]">{index + 1}</span>
          </span>
        )}
      </Button>

      {slot && !isGenerating ? (
        <button
          type="button"
          onClick={() => onRemoveImage(index)}
          aria-label={`Remove image ${index + 1}`}
          className="absolute top-0 right-0 z-10 inline-flex h-5 w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/10 bg-background/50 text-red-500 shadow-sm transition hover:bg-background"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  )
}

function App() {
  const isDev = import.meta.env.DEV
  const downloadAiImageServerFn = useServerFn(downloadAiImage)
  const generateAiImagesServerFn = useServerFn(generateAiImages)
  const upscaleAiImageServerFn = useServerFn(upscaleAiImage)
  const [prompt, setPrompt] = useState("")
  const [generateCount, setGenerateCount] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1")
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
    () => slots.flatMap((slot) => (slot ? [slot.dataUrl] : [])),
    [slots]
  )
  const isGenerateDisabled =
    isGenerating || selectedImages.length === 0 || prompt.trim().length === 0

  const generatedImages = useMemo<GalleryItem[]>(() => {
    if (generatedSlots.length > 0) {
      return generatedSlots.map((slot, i) => {
        const src = slot.upscaledSrc ?? slot.generatedSrc ?? undefined

        return {
          id: `generated-${i + 1}`,
          label: `Result ${i + 1}`,
          status: src ? "ready" : "loading",
          src,
          isUpscaled: Boolean(slot.upscaledSrc),
        }
      })
    }

    const safeCount = Math.min(
      Math.max(generateCount || 1, 1),
      MAX_GENERATE_COUNT
    )

    return Array.from({ length: safeCount }, (_, i) => {
      const [ratioWidth, ratioHeight] = aspectRatio
        .split(":")
        .map((value) => Number.parseInt(value, 10))
      const safeRatioWidth = Number.isFinite(ratioWidth) ? ratioWidth : 1
      const safeRatioHeight = Number.isFinite(ratioHeight) ? ratioHeight : 1
      const svgWidth = safeRatioWidth * 100
      const svgHeight = safeRatioHeight * 100
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgWidth}' height='${svgHeight}' viewBox='0 0 ${svgWidth} ${svgHeight}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#f59e0b'/><stop offset='1' stop-color='#0f172a'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/></svg>`

      return {
        id: `generated-${i + 1}`,
        src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
        label: `Result ${i + 1}`,
        status: "preview",
      }
    })
  }, [aspectRatio, generateCount, generatedSlots])

  const selectedImage = useMemo(
    () =>
      generatedImages.find((item) => item.id === selectedId) ??
      generatedImages[0],
    [generatedImages, selectedId]
  )
  const selectedGeneratedSlot = useMemo(() => {
    if (!selectedImage) return null

    const selectedIndex = Number.parseInt(
      selectedImage.id.replace("generated-", ""),
      10
    )
    const slotIndex = selectedIndex - 1
    if (!Number.isFinite(slotIndex) || slotIndex < 0) {
      return null
    }

    return generatedSlots[slotIndex] ?? null
  }, [generatedSlots, selectedImage])
  const selectedAspectRatio = useMemo(() => {
    const [width, height] = aspectRatio
      .split(":")
      .map((value) => Number.parseInt(value, 10))
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 1
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 1
    return safeWidth / safeHeight
  }, [aspectRatio])

  const onPickImage = useCallback(async (index: number, file?: File) => {
    if (!file) return

    const dataUrl = await fileToDataUrl(file)
    setSlots((prev) => {
      const next = [...prev]
      next[index] = {
        previewUrl: dataUrl,
        dataUrl,
      }
      return next
    })
  }, [])

  const onRemoveImage = (index: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  const onGenerate = async () => {
    if (selectedImages.length === 0) {
      setGenerateError("Please select at least one input image")
      return
    }

    const safeCount = Math.min(
      Math.max(generateCount || 1, 1),
      MAX_GENERATE_COUNT
    )

    setIsGenerating(true)
    setDownloadError(null)
    setGenerateError(null)
    setUpscaleError(null)
    setGeneratedSlots(
      Array.from({ length: safeCount }, () => ({
        generatedSrc: null,
        upscaledSrc: null,
      }))
    )
    setSelectedId("generated-1")

    try {
      const payload = {
        prompt: prompt.trim() || "Edit this image with the reference subjects",
        count: safeCount,
        mock: isDev && isMockEnabled,
        goFast: true,
        megapixels: "1" as const,
        aspectRatio,
        inputImagesDataUrls: selectedImages,
        outputFormat: "jpg" as const,
        outputQuality: 95,
      }

      const response = await generateAiImagesServerFn({ data: payload })
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

      setGeneratedSlots(
        generated.map((imageUrl) => ({
          generatedSrc: imageUrl,
          upscaledSrc: null,
        }))
      )
      setSelectedId("generated-1")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed"
      setGenerateError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const onUpscale = async () => {
    if (
      !selectedImage?.src ||
      selectedImage.status !== "ready" ||
      selectedImage.isUpscaled
    ) {
      return
    }

    setIsUpscaling(true)
    setDownloadError(null)
    setUpscaleError(null)

    try {
      const response = await upscaleAiImageServerFn({
        data: { image: selectedImage.src },
      })
      const image = response.image?.trim()
      if (!image) {
        throw new Error("Upscale did not return an image")
      }

      const selectedIndex = Number.parseInt(
        selectedImage.id.replace("generated-", ""),
        10
      )
      const slotIndex = selectedIndex - 1
      if (!Number.isFinite(slotIndex) || slotIndex < 0) {
        throw new Error("Unable to determine generated image slot")
      }

      setGeneratedSlots((prev) =>
        prev.map((slot, index) =>
          index === slotIndex
            ? {
                ...slot,
                upscaledSrc: image,
              }
            : slot
        )
      )
      setSelectedId(selectedImage.id)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image upscale failed"
      setUpscaleError(message)
    } finally {
      setIsUpscaling(false)
    }
  }

  const onDownloadImage = useCallback(
    async (imageUrl: string, filename: string) => {
      setIsDownloading(true)
      setDownloadError(null)

      try {
        const response = await downloadAiImageServerFn({
          data: { imageUrl },
        })
        const byteString = atob(response.base64)
        const bytes = new Uint8Array(byteString.length)
        for (let i = 0; i < byteString.length; i++) {
          bytes[i] = byteString.charCodeAt(i)
        }

        const blob = new Blob([bytes], {
          type: response.contentType || "application/octet-stream",
        })
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(blobUrl)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Image download failed"
        setDownloadError(message)
      } finally {
        setIsDownloading(false)
      }
    },
    [downloadAiImageServerFn]
  )

  return (
    <main className="min-h-svh bg-[linear-gradient(140deg,#f8fafc_0%,#fff7ed_45%,#f1f5f9_100%)] p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-450 grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="bg-white/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">IMG Edit</CardTitle>
            <CardDescription>Edit your images</CardDescription>
          </CardHeader>

          <CardContent>
            <section>
              <h2 className="text-sm font-medium text-slate-900">
                Input Images
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {slots.map((slot, index) => (
                  <InputImageSlot
                    key={`slot-${index + 1}`}
                    index={index}
                    slot={slot}
                    isGenerating={isGenerating}
                    onPickImage={onPickImage}
                    onRemoveImage={onRemoveImage}
                  />
                ))}
              </div>
            </section>

            <section className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt here. Please be specific about the edits you want to see on the input image(s). For example: 'Make the image look like it was taken during sunset, with warm tones and long shadows.'"
                  rows={6}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="count">How many images to generate</Label>
                <Select
                  value={String(generateCount)}
                  onValueChange={(value) => setGenerateCount(Number(value))}
                >
                  <SelectTrigger id="count">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATE_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                <Select
                  value={aspectRatio}
                  onValueChange={(value) =>
                    setAspectRatio(value as AspectRatio)
                  }
                >
                  <SelectTrigger id="aspect-ratio">
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIO_OPTIONS.map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>
                        {ratio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isDev ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mock-mode"
                    checked={isMockEnabled}
                    onCheckedChange={(checked) =>
                      setIsMockEnabled(checked === true)
                    }
                  />
                  <Label htmlFor="mock-mode">Mock</Label>
                </div>
              ) : null}

              <Button
                type="button"
                onClick={onGenerate}
                disabled={isGenerateDisabled}
                className="mt-1 flex w-full items-center gap-2"
              >
                <Upload size={16} />
                {isGenerating ? "Generating..." : "Generate"}
              </Button>

              {generateError ? (
                <p className="text-sm text-red-600">{generateError}</p>
              ) : null}
            </section>
          </CardContent>
        </Card>

        <Card className="bg-white/85 backdrop-blur">
          <CardContent className="p-4 md:p-5">
            <div className="relative border border-border bg-muted">
              {selectedImage?.status === "ready" && selectedImage.src ? (
                <div className="absolute right-1 z-10 flex items-center gap-2">
                  {selectedImage.isUpscaled ? (
                    <span className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white">
                      Upscaled
                    </span>
                  ) : null}
                  {!selectedImage.isUpscaled ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onUpscale}
                      disabled={isUpscaling || isGenerating}
                    >
                      {isUpscaling ? "Upscaling..." : "Upscale"}
                    </Button>
                  ) : null}
                  {selectedGeneratedSlot?.generatedSrc ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm">
                          <Download size={14} />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-56 rounded-md border border-slate-200 bg-white text-slate-900 shadow-lg dark:bg-white dark:text-slate-900"
                      >
                        <DropdownMenuItem
                          disabled={isDownloading}
                          onSelect={(event) => {
                            event.preventDefault()
                            const generatedSrc =
                              selectedGeneratedSlot.generatedSrc
                            if (!generatedSrc) return
                            void onDownloadImage(
                              generatedSrc,
                              `${selectedImage.id}-generated.jpg`
                            )
                          }}
                          className="w-full px-3 py-2 text-sm focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                        >
                          {isDownloading
                            ? "Downloading..."
                            : "Download Generated"}
                        </DropdownMenuItem>
                        {selectedGeneratedSlot.upscaledSrc ? (
                          <DropdownMenuItem
                            disabled={isDownloading}
                            onSelect={(event) => {
                              event.preventDefault()
                              const upscaledSrc =
                                selectedGeneratedSlot.upscaledSrc
                              if (!upscaledSrc) return
                              void onDownloadImage(
                                upscaledSrc,
                                `${selectedImage.id}-upscaled.jpg`
                              )
                            }}
                            className="w-full px-3 py-2 text-sm focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                          >
                            {isDownloading
                              ? "Downloading..."
                              : "Download Upscaled"}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              ) : null}

              {selectedImage?.status === "loading" ? (
                <div className="flex h-[52vh] w-full items-center justify-center sm:h-[68vh]">
                  <div
                    className="h-full max-w-full"
                    style={{ aspectRatio: selectedAspectRatio }}
                  >
                    <Skeleton className="h-full w-full bg-slate-300/90" />
                  </div>
                </div>
              ) : selectedImage?.src ? (
                <img
                  src={selectedImage.src}
                  alt={selectedImage.label}
                  className="h-[52vh] w-full object-contain sm:h-[68vh]"
                />
              ) : (
                <div className="flex h-[52vh] w-full items-center justify-center bg-slate-200 text-sm text-slate-500 sm:h-[68vh]">
                  No image selected
                </div>
              )}
            </div>

            {upscaleError ? (
              <p className="mt-3 text-sm text-red-600">{upscaleError}</p>
            ) : null}
            {downloadError ? (
              <p className="mt-3 text-sm text-red-600">{downloadError}</p>
            ) : null}

            <div className="mt-4 w-full border border-border bg-muted/40 p-3">
              <h2 className="text-sm font-medium text-slate-900">
                Generated Images
              </h2>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                {generatedImages.map((item) => {
                  const active = selectedImage?.id === item.id

                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedId(item.id)}
                      className={`h-auto overflow-hidden p-0 ${active ? "border-amber-500 ring-2 ring-amber-200" : ""}`}
                    >
                      <div className="relative w-full">
                        {item.status === "loading" ? (
                          <Skeleton className="aspect-square w-full" />
                        ) : item.src ? (
                          <img
                            src={item.src}
                            alt={item.label}
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <span className="flex aspect-square w-full items-center justify-center bg-slate-200 text-xs text-slate-500">
                            {item.label}
                          </span>
                        )}
                        {item.isUpscaled ? (
                          <span className="absolute top-1 right-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Upscaled
                          </span>
                        ) : null}
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function fileToDataUrl(file: File): Promise<string> {
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
