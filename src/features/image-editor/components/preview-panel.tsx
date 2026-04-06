import {
  Download,
  Expand,
  Eye,
  History,
  ImageUpscale,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { MAX_SLOTS } from "../helpers"
import type { ImageEditorController } from "../use-image-editor"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

type PreviewPanelProps = {
  controller: ImageEditorController
}

const DROPDOWN_ITEM_CLASSNAME =
  "w-full px-3 py-2 text-sm focus:bg-secondary focus:text-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"

export function PreviewPanel({ controller }: PreviewPanelProps) {
  const selectedImage = controller.selectedImage
  const selectedGeneratedSlot = controller.selectedGeneratedSlot

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-12 items-center justify-between border-b border-border/60 bg-card px-4 sm:px-6">
        <div className="hidden items-center gap-6 font-mono text-[10px] font-bold tracking-wider text-muted-foreground md:flex">
          <div className="flex items-center gap-2">
            <span className="text-primary">PREVIEW_MODE:</span>
            <span className="text-foreground">SINGLE_ENTITY</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary">ZOOM:</span>
            <span className="text-foreground">100%</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {!selectedImage.isUpscaled && selectedImage.status === "ready" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={controller.onUpscale}
              disabled={controller.isUpscaling || controller.isGenerating}
              className="h-8 font-mono text-[10px] tracking-wide uppercase"
            >
              <ImageUpscale size={14} />
              {controller.isUpscaling ? "UPSCALING..." : "UPSCALE"}
            </Button>
          ) : null}

          {selectedGeneratedSlot?.generatedSrc ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 font-mono text-[10px] tracking-wide uppercase"
                >
                  USE_AS_INPUT
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-56 rounded-none border border-border bg-popover text-popover-foreground shadow-xl"
              >
                {Array.from({ length: MAX_SLOTS }, (_, index) => (
                  <DropdownMenuItem
                    key={`use-as-input-${index + 1}`}
                    disabled={controller.isGenerating}
                    onSelect={() => {
                      controller.onUseGeneratedImageAsInput(index)
                    }}
                    className={DROPDOWN_ITEM_CLASSNAME}
                  >
                    Input Image {index + 1}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {selectedGeneratedSlot?.generatedSrc ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 font-mono text-[10px] tracking-wide uppercase"
                >
                  <Download size={13} />
                  DOWNLOAD
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-56 rounded-none border border-border bg-popover text-popover-foreground shadow-xl"
              >
                <DropdownMenuItem
                  disabled={controller.isDownloading}
                  onSelect={(event) => {
                    event.preventDefault()
                    const generatedSrc = selectedGeneratedSlot.generatedSrc
                    if (!generatedSrc) {
                      return
                    }

                    void controller.onDownloadImage(
                      generatedSrc,
                      `${selectedImage.id}-generated.jpg`
                    )
                  }}
                  className={DROPDOWN_ITEM_CLASSNAME}
                >
                  {controller.isDownloading
                    ? "Downloading..."
                    : "Download Generated"}
                </DropdownMenuItem>

                {selectedGeneratedSlot.upscaledSrc ? (
                  <DropdownMenuItem
                    disabled={controller.isDownloading}
                    onSelect={(event) => {
                      event.preventDefault()
                      const upscaledSrc = selectedGeneratedSlot.upscaledSrc
                      if (!upscaledSrc) {
                        return
                      }

                      void controller.onDownloadImage(
                        upscaledSrc,
                        `${selectedImage.id}-upscaled.jpg`
                      )
                    }}
                    className={DROPDOWN_ITEM_CLASSNAME}
                  >
                    {controller.isDownloading
                      ? "Downloading..."
                      : "Download Upscaled"}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
            <ZoomIn size={15} />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
            <ZoomOut size={15} />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
            <Expand size={15} />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-0">
        <div className="relative h-[52vh] w-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] bg-size-[24px_24px] opacity-30" />
          <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden border border-border/30 bg-transparent shadow-[0_40px_100px_rgba(167,0,112,0.12)]">
            {selectedImage.status === "loading" ? (
              <div className="grid h-full w-full place-items-center">
                <div
                  className="h-full max-w-full"
                  style={{ aspectRatio: controller.selectedAspectRatio }}
                >
                  <Skeleton className="h-full w-full bg-zinc-300/70" />
                </div>
              </div>
            ) : selectedImage.src ? (
              <img
                src={selectedImage.src}
                alt={selectedImage.label}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-transparent font-mono text-xs tracking-wider text-muted-foreground">
                NO IMAGE SELECTED
              </div>
            )}

            {selectedImage.src ? (
              <>
                <div className="absolute top-4 left-4 border border-white/15 bg-zinc-900/80 px-3 py-2 font-mono text-[10px] tracking-widest text-zinc-100 uppercase backdrop-blur">
                  Metadata: 1024x1024 / sRGB / v2.4
                </div>
                {selectedImage.isUpscaled ? (
                  <span className="absolute top-4 right-4 bg-amber-500 px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-white uppercase">
                    UPSCALED
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {controller.upscaleError ? (
        <p className="px-4 pb-2 text-xs text-destructive sm:px-6">
          {controller.upscaleError}
        </p>
      ) : null}

      {controller.downloadError ? (
        <p className="px-4 pb-2 text-xs text-destructive sm:px-6">
          {controller.downloadError}
        </p>
      ) : null}

      <div className="h-44 border-t border-border/60 bg-muted/40 px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
            <History size={13} />
            GENERATION_HISTORY
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 font-mono text-[10px] font-bold tracking-[0.15em] text-primary uppercase"
          >
            EXPORT_ALL
          </Button>
        </div>

        <div className="flex h-[110px] gap-3 overflow-x-auto pb-2">
          {controller.generatedImages.map((item) => {
            const active = selectedImage.id === item.id

            return (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                onClick={() => controller.onSelectGeneratedImage(item.id)}
                className={`group relative h-full w-[110px] shrink-0 overflow-hidden rounded-none p-0 ${
                  active
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/60"
                }`}
              >
                {item.status === "loading" ? (
                  <Skeleton className="h-full w-full" />
                ) : item.src ? (
                  <img
                    src={item.src}
                    alt={item.label}
                    className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-muted font-mono text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                )}

                {!active && item.src ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                    <Eye size={15} />
                  </span>
                ) : null}

                {item.isUpscaled ? (
                  <span className="absolute top-1 right-1 bg-amber-500 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white uppercase">
                    U
                  </span>
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
