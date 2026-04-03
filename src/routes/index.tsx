import { useMemo, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { ImagePlus, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateAiImages } from "@/lib/server/generate-ai-images"
import { Textarea } from "@/components/ui/textarea"

export const Route = createFileRoute("/")({ component: App })

type GalleryItem = {
  id: string
  label: string
  status: "preview" | "loading" | "ready" | "error"
  src?: string
}

type SelectedImageSlot = {
  previewUrl: string
  dataUrl: string
}

const MAX_SLOTS = 3
const MAX_GENERATE_COUNT = 4
const GENERATE_COUNT_OPTIONS = Array.from(
  { length: MAX_GENERATE_COUNT },
  (_, i) => i + 1
)

function App() {
  const generateAiImagesServerFn = useServerFn(generateAiImages)
  const [prompt, setPrompt] = useState("")
  const [generateCount, setGenerateCount] = useState(1)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [generatedSlots, setGeneratedSlots] = useState<Array<string | null>>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [slots, setSlots] = useState<Array<SelectedImageSlot | null>>(
    Array.from({ length: MAX_SLOTS }, () => null)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const selectedImages = useMemo(
    () => slots.flatMap((slot) => (slot ? [slot.dataUrl] : [])),
    [slots]
  )
  const isGenerateDisabled =
    isGenerating ||
    selectedImages.length === 0 ||
    prompt.trim().length === 0

  const generatedImages = useMemo<GalleryItem[]>(() => {
    if (generatedSlots.length > 0) {
      return generatedSlots.map((src, i) => ({
        id: `generated-${i + 1}`,
        label: `Result ${i + 1}`,
        status: src ? "ready" : "loading",
        src: src ?? undefined,
      }))
    }

    const safeCount = Math.min(
      Math.max(generateCount || 1, 1),
      MAX_GENERATE_COUNT
    )

    return Array.from({ length: safeCount }, (_, i) => {
      const safeWidth = Math.min(Math.max(width || 1024, 128), 4096)
      const safeHeight = Math.min(Math.max(height || 1024, 128), 4096)
      const text = prompt.trim() || "IMG Edit Preview"
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${safeWidth}' height='${safeHeight}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#f59e0b'/><stop offset='1' stop-color='#0f172a'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='45%' text-anchor='middle' fill='#f8fafc' font-family='monospace' font-size='34'>${escapeSvg(text)}</text><text x='50%' y='57%' text-anchor='middle' fill='#e2e8f0' font-family='monospace' font-size='22'>${safeWidth} x ${safeHeight} • #${i + 1}</text></svg>`

      return {
        id: `generated-${i + 1}`,
        src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
        label: `Result ${i + 1}`,
        status: "preview",
      }
    })
  }, [generateCount, generatedSlots, height, prompt, width])

  const selectedImage = useMemo(
    () =>
      generatedImages.find((item) => item.id === selectedId) ??
      generatedImages[0],
    [generatedImages, selectedId]
  )

  const openFilePicker = (index: number) => {
    fileInputRefs.current[index]?.click()
  }

  const onPickImage = async (index: number, fileList: FileList | null) => {
    const file = fileList?.[0]
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
  }

  const onRemoveImage = (index: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })

    const input = fileInputRefs.current[index]
    if (input) input.value = ""
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
    setGenerateError(null)
    setGeneratedSlots(Array.from({ length: safeCount }, () => null))
    setSelectedId("generated-1")

    try {
      const payload = {
        prompt: prompt.trim() || "Edit this image with the reference subjects",
        count: safeCount,
        resolution: "1 MP" as const,
        aspectRatio: "3:4" as const,
        inputImagesDataUrls: selectedImages,
        outputFormat: "jpg" as const,
        outputQuality: 80,
        safetyTolerance: 2,
        promptUpsampling: false,
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

      setGeneratedSlots(generated)
      setSelectedId("generated-1")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed"
      setGenerateError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(140deg,#f8fafc_0%,#fff7ed_45%,#f1f5f9_100%)] p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="bg-white/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">IMG Edit</CardTitle>
            <CardDescription>Trigger.dev + Replicate workflow</CardDescription>
          </CardHeader>

          <CardContent>
            <section>
              <h2 className="text-sm font-medium text-slate-900">
                Image Placeholders
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {slots.map((slot, index) => (
                  <div key={`slot-${index + 1}`} className="relative">
                    <input
                      ref={(el) => {
                        fileInputRefs.current[index] = el
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void onPickImage(index, e.target.files)
                      }}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openFilePicker(index)}
                      className="relative aspect-square h-auto w-full overflow-hidden border-dashed p-0"
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
                  placeholder="Describe style or edit direction"
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Input images</Label>
                <p className="rounded border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {selectedImages.length} image
                  {selectedImages.length === 1 ? "" : "s"} selected
                </p>
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    min={128}
                    max={4096}
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    min={128}
                    max={4096}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                  />
                </div>
              </div>

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
            <div className="border border-border bg-muted p-2">
              {selectedImage?.status === "loading" ? (
                <div className="flex h-[44vh] w-full items-center justify-center bg-slate-100 sm:h-[56vh]">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
                </div>
              ) : selectedImage?.src ? (
                <img
                  src={selectedImage.src}
                  alt={selectedImage.label}
                  className="h-[44vh] w-full object-contain sm:h-[56vh]"
                />
              ) : (
                <div className="flex h-[44vh] w-full items-center justify-center bg-slate-200 text-sm text-slate-500 sm:h-[56vh]">
                  No image selected
                </div>
              )}
            </div>

            <div className="mt-4">
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
                      {item.status === "loading" ? (
                        <span className="flex aspect-square w-full items-center justify-center bg-slate-100">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        </span>
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

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
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
