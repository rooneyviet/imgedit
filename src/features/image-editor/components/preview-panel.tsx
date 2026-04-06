import { Download, ImageUpscale } from "lucide-react"

import { MAX_SLOTS } from "../helpers"
import type { ImageEditorController } from "../use-image-editor"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  "w-full px-3 py-2 text-sm focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"

export function PreviewPanel({ controller }: PreviewPanelProps) {
  const selectedImage = controller.selectedImage
  const selectedGeneratedSlot = controller.selectedGeneratedSlot

  return (
    <Card className="bg-white/85 backdrop-blur">
      <CardContent className="p-4 md:p-5">
        <div className="relative border border-border bg-muted">
          {selectedImage.status === "ready" && selectedImage.src ? (
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
                  onClick={controller.onUpscale}
                  disabled={controller.isUpscaling || controller.isGenerating}
                >
                  <ImageUpscale size={14} />
                  {controller.isUpscaling ? "Upscaling..." : "Upscale"}
                </Button>
              ) : null}

              {selectedGeneratedSlot?.generatedSrc ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm">
                      Use this as input image
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-56 rounded-md border border-slate-200 bg-white text-slate-900 shadow-lg dark:bg-white dark:text-slate-900"
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
            </div>
          ) : null}

          {selectedImage.status === "loading" ? (
            <div className="flex h-[52vh] w-full items-center justify-center sm:h-[68vh]">
              <div
                className="h-full max-w-full"
                style={{ aspectRatio: controller.selectedAspectRatio }}
              >
                <Skeleton className="h-full w-full bg-slate-300/90" />
              </div>
            </div>
          ) : selectedImage.src ? (
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

        {controller.upscaleError ? (
          <p className="mt-3 text-sm text-red-600">{controller.upscaleError}</p>
        ) : null}

        {controller.downloadError ? (
          <p className="mt-3 text-sm text-red-600">{controller.downloadError}</p>
        ) : null}

        <div className="mt-4 w-full border border-border bg-muted/40 p-3">
          <h2 className="text-sm font-medium text-slate-900">Generated Images</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {controller.generatedImages.map((item) => {
              const active = selectedImage.id === item.id

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  onClick={() => controller.onSelectGeneratedImage(item.id)}
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
  )
}
