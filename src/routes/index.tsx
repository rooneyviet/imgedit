import { useMemo, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ImagePlus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export const Route = createFileRoute("/")({ component: App })

type GalleryItem = {
  id: string
  src: string
  label: string
}

const MAX_SLOTS = 8

function App() {
  const [prompt, setPrompt] = useState("")
  const [generateCount, setGenerateCount] = useState(4)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [slots, setSlots] = useState<Array<string | null>>(
    Array.from({ length: MAX_SLOTS }, () => null),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const selectedImages = useMemo(() => slots.filter((slot): slot is string => Boolean(slot)), [slots])

  const generatedImages = useMemo<GalleryItem[]>(() => {
    const safeCount = Math.min(Math.max(generateCount || 1, 1), 24)

    if (selectedImages.length === 0) {
      return Array.from({ length: safeCount }, (_, i) => {
        const safeWidth = Math.min(Math.max(width || 1024, 128), 4096)
        const safeHeight = Math.min(Math.max(height || 1024, 128), 4096)
        const text = prompt.trim() || "IMG Edit Preview"
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${safeWidth}' height='${safeHeight}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#f59e0b'/><stop offset='1' stop-color='#0f172a'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='45%' text-anchor='middle' fill='#f8fafc' font-family='monospace' font-size='34'>${escapeSvg(text)}</text><text x='50%' y='57%' text-anchor='middle' fill='#e2e8f0' font-family='monospace' font-size='22'>${safeWidth} x ${safeHeight} • #${i + 1}</text></svg>`

        return {
          id: `generated-${i + 1}`,
          src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
          label: `Result ${i + 1}`,
        }
      })
    }

    return Array.from({ length: safeCount }, (_, i) => {
      const src = selectedImages[i % selectedImages.length]
      return {
        id: `generated-${i + 1}`,
        src,
        label: `Result ${i + 1}`,
      }
    })
  }, [generateCount, height, prompt, selectedImages, width])

  const selectedImage = useMemo(
    () => generatedImages.find((item) => item.id === selectedId) ?? generatedImages[0],
    [generatedImages, selectedId],
  )

  const openFilePicker = (index: number) => {
    fileInputRefs.current[index]?.click()
  }

  const onPickImage = (index: number, fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setSlots((prev) => {
      const next = [...prev]
      next[index] = url
      return next
    })
  }

  const onGenerate = () => {
    const firstImage = generatedImages[0]
    setSelectedId(firstImage?.id ?? null)
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(140deg,#f8fafc_0%,#fff7ed_45%,#f1f5f9_100%)] p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="bg-white/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">IMG Edit</CardTitle>
            <CardDescription>Single page editor UI (no API)</CardDescription>
          </CardHeader>

          <CardContent>
            <section>
              <h2 className="text-sm font-medium text-slate-900">Image Placeholders</h2>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {slots.map((slot, index) => (
                  <Button
                    key={`slot-${index + 1}`}
                    type="button"
                    variant="outline"
                    onClick={() => openFilePicker(index)}
                    className="relative aspect-square h-auto w-full overflow-hidden border-dashed p-0"
                  >
                    <input
                      ref={(el) => {
                        fileInputRefs.current[index] = el
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickImage(index, e.target.files)}
                    />

                    {slot ? (
                      <img src={slot} alt={`Selected ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                        <ImagePlus size={16} />
                        <span className="text-[10px]">{index + 1}</span>
                      </span>
                    )}
                  </Button>
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
                <Label htmlFor="count">How many images to generate</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={24}
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                />
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

              <Button type="button" onClick={onGenerate} className="mt-1 flex w-full items-center gap-2">
                <Upload size={16} />
                Generate
              </Button>
            </section>
          </CardContent>
        </Card>

        <Card className="bg-white/85 backdrop-blur">
          <CardContent className="p-4 md:p-5">
            <div className="border border-border bg-muted p-2">
              {selectedImage ? (
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
              <h2 className="text-sm font-medium text-slate-900">Generated Images</h2>
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
                      <img src={item.src} alt={item.label} className="aspect-square w-full object-cover" />
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
