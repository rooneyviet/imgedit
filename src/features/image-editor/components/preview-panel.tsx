import { useEffect, useRef, useState } from "react"
import {
  Download,
  Expand,
  History,
  ImageUpscale,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider"
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch"

import { MAX_SLOTS } from "../helpers"
import type { ImageEditorController } from "../use-image-editor"
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

type PreviewPanelProps = {
  controller: ImageEditorController
}

const DROPDOWN_ITEM_CLASSNAME =
  "w-full px-3 py-2 text-sm focus:bg-secondary focus:text-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-foreground"

export function PreviewPanel({ controller }: PreviewPanelProps) {
  const selectedImage = controller.selectedImage
  const selectedGeneratedSlot = controller.selectedGeneratedSlot
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [isCompareEnabled, setIsCompareEnabled] = useState(false)
  const [previewZoomPercent, setPreviewZoomPercent] = useState(100)
  const [fullscreenZoomPercent, setFullscreenZoomPercent] = useState(100)
  const previewZoomRef = useRef<ReactZoomPanPinchContentRef | null>(null)
  const fullscreenZoomRef = useRef<ReactZoomPanPinchContentRef | null>(null)
  const canShowCompareControl =
    selectedImage.status === "ready" && selectedImage.isUpscaled
  const hasCompareImages =
    Boolean(selectedGeneratedSlot?.generatedSrc) &&
    Boolean(selectedGeneratedSlot?.upscaledSrc)
  const isCompareZoomCompatible = previewZoomPercent === 100
  const showCompareSlider =
    canShowCompareControl &&
    hasCompareImages &&
    isCompareZoomCompatible &&
    isCompareEnabled

  useEffect(() => {
    setPreviewZoomPercent(100)
    previewZoomRef.current?.resetTransform(0)
  }, [selectedImage.src])

  useEffect(() => {
    if (!isFullscreenOpen) {
      return
    }

    setFullscreenZoomPercent(100)
    fullscreenZoomRef.current?.resetTransform(0)
  }, [isFullscreenOpen, selectedImage.src])

  useEffect(() => {
    if (canShowCompareControl) {
      return
    }

    setIsCompareEnabled(false)
  }, [canShowCompareControl])

  const canZoomImage =
    Boolean(selectedImage.src) && selectedImage.status !== "loading"

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-12 items-center justify-between border-b border-border/60 bg-card px-4 sm:px-6">
        <div className="hidden items-center gap-6 font-mono text-[10px] font-bold tracking-wider text-muted-foreground md:flex">
          <div className="flex items-center gap-2">
            <span className="text-primary">Zoom:</span>
            <span className="text-foreground">{previewZoomPercent}%</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {selectedImage.status === "ready" && !selectedImage.isUpscaled ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={controller.onUpscale}
              disabled={controller.isUpscaling || controller.isGenerating}
              className="h-8 font-mono text-[10px] tracking-wide"
            >
              <ImageUpscale size={14} />
              {controller.isUpscaling ? "Upscaling..." : "Upscale"}
            </Button>
          ) : null}

          {canShowCompareControl ? (
            <Label
              htmlFor="compare-mode"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-secondary px-3 font-mono text-[10px] font-bold tracking-wide text-foreground"
            >
              <Checkbox
                id="compare-mode"
                checked={isCompareEnabled}
                onCheckedChange={(checked) => {
                  setIsCompareEnabled(checked === true)
                }}
                disabled={!isCompareZoomCompatible}
                className="rounded-xs border-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              Compare
            </Label>
          ) : null}

          {canShowCompareControl ? (
            <span className="inline-flex h-8 items-center rounded-md bg-amber-500 px-3 font-mono text-[10px] font-bold tracking-wide text-white">
              Upscaled
            </span>
          ) : null}

          {selectedGeneratedSlot?.generatedSrc ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 font-mono text-[10px] tracking-wide"
                >
                  Use as Input
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
                  className="h-8 font-mono text-[10px] tracking-wide"
                >
                  <Download size={13} />
                  Download
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

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => previewZoomRef.current?.zoomIn(0.2)}
            disabled={!canZoomImage}
          >
            <ZoomIn size={15} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => previewZoomRef.current?.zoomOut(0.2)}
            disabled={!canZoomImage}
          >
            <ZoomOut size={15} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsFullscreenOpen(true)}
            disabled={!selectedImage.src}
          >
            <Expand size={15} />
          </Button>
        </div>
      </div>

      <div className="relative flex h-150 items-center justify-center overflow-hidden p-0">
        <div
          className="relative h-full w-auto"
          style={{ aspectRatio: controller.selectedAspectRatio }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] bg-size-[24px_24px] opacity-30" />
          <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden border border-border/30 bg-transparent shadow-[0_40px_100px_rgba(167,0,112,0.12)]">
            {selectedImage.status === "loading" ? (
              <div className="grid h-full w-full place-items-center">
                <div className="h-full w-full">
                  <Skeleton className="h-full w-full bg-zinc-300/70" />
                </div>
              </div>
            ) : selectedImage.src ? (
              <TransformWrapper
                ref={previewZoomRef}
                initialScale={1}
                minScale={1}
                maxScale={4}
                wheel={{ disabled: true }}
                pinch={{ disabled: true }}
                panning={{ disabled: true }}
                doubleClick={{ disabled: true }}
                onTransform={(_, state) => {
                  setPreviewZoomPercent(Math.round(state.scale * 100))
                }}
              >
                <TransformComponent
                  wrapperClass="!h-full !w-full"
                  contentClass="!flex !h-full !w-full !items-center !justify-center"
                >
                  {showCompareSlider &&
                  selectedGeneratedSlot?.generatedSrc &&
                  selectedGeneratedSlot?.upscaledSrc ? (
                    <div className="relative h-full w-full">
                      <ReactCompareSlider
                        itemOne={
                          <ReactCompareSliderImage
                            src={selectedGeneratedSlot.generatedSrc}
                            alt={`${selectedImage.label} generated`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        }
                        itemTwo={
                          <ReactCompareSliderImage
                            src={selectedGeneratedSlot.upscaledSrc}
                            alt={`${selectedImage.label} upscaled`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        }
                        style={{ width: "100%", height: "100%" }}
                      />

                      <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex items-center justify-between">
                        <span className="rounded-md bg-black/65 px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-white">
                          Before upscale
                        </span>
                        <span className="rounded-md bg-black/65 px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-white">
                          After upscale
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={selectedImage.src}
                      alt={selectedImage.label}
                      className="h-full w-full object-contain select-none"
                      draggable={false}
                    />
                  )}
                </TransformComponent>
              </TransformWrapper>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-transparent font-mono text-xs tracking-wider text-muted-foreground">
                No image selected
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0! left-0! h-screen! w-screen! max-w-none! translate-x-0! translate-y-0! gap-0 border-0 bg-black p-0 text-white ring-0"
        >
          <DialogTitle className="sr-only">
            Fullscreen image preview
          </DialogTitle>

          <div className="flex h-12 items-center justify-between border-b border-white/15 px-4">
            <span className="font-mono text-[10px] font-bold tracking-[0.15em]">
              Zoom: {fullscreenZoomPercent}%
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => fullscreenZoomRef.current?.zoomOut(0.2)}
                disabled={!selectedImage.src}
              >
                <ZoomOut size={15} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => fullscreenZoomRef.current?.zoomIn(0.2)}
                disabled={!selectedImage.src}
              >
                <ZoomIn size={15} />
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 font-mono text-[10px] tracking-wider"
                >
                  Close
                </Button>
              </DialogClose>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-black">
            {selectedImage.src ? (
              <TransformWrapper
                ref={fullscreenZoomRef}
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit
                wheel={{ step: 0.1 }}
                panning={{ disabled: false }}
                pinch={{ disabled: false }}
                trackPadPanning={{ disabled: false }}
                onTransform={(_, state) => {
                  setFullscreenZoomPercent(Math.round(state.scale * 100))
                }}
              >
                <TransformComponent
                  wrapperClass="!h-full !w-full"
                  contentClass="!flex !h-full !w-full !items-center !justify-center"
                >
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.label}
                    className="max-h-full max-w-full object-contain select-none"
                    draggable={false}
                  />
                </TransformComponent>
              </TransformWrapper>
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-xs tracking-wider text-zinc-400">
                No image selected
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          <h2 className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            <History size={13} />
            Generated Images
          </h2>
          {/* <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 font-mono text-[10px] font-bold tracking-[0.15em] text-primary"
          >
            Export all
          </Button> */}
        </div>

        <div className="flex h-27.5 gap-3 overflow-x-auto pb-2">
          {controller.generatedImages.map((item) => {
            const active = selectedImage.id === item.id

            return (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                onClick={() => controller.onSelectGeneratedImage(item.id)}
                className={`group relative h-full w-27.5 shrink-0 overflow-hidden rounded-none p-0 ${
                  active ? "border-primary" : "border-border/60"
                }`}
              >
                {item.src ? (
                  <img
                    src={item.src}
                    alt={item.label}
                    className="h-full w-full object-cover transition-all group-hover:grayscale-0"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-muted font-mono text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                )}

                {item.status === "loading" ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/70 text-muted-foreground">
                    <LoaderCircle size={16} className="animate-spin" />
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
