import { useCallback } from "react"
import { ImagePlus, X } from "lucide-react"
import { useDropzone } from "react-dropzone"

import type { SelectedImageSlot } from "../helpers"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type InputImageSlotProps = {
  index: number
  slot: SelectedImageSlot | null
  isGenerating: boolean
  onPickImage: (index: number, file?: File) => Promise<void>
  onRemoveImage: (index: number) => void
}

export function InputImageSlot({
  index,
  slot,
  isGenerating,
  onPickImage,
  onRemoveImage,
}: InputImageSlotProps) {
  const onDropAccepted = useCallback(
    (files: Array<File>) => {
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
