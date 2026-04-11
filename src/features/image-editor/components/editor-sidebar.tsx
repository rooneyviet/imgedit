import { Terminal, WandSparkles } from "lucide-react"

import {
  ASPECT_RATIO_OPTIONS,
  GENERATE_COUNT_OPTIONS,
  calculateAspectRatioValue,
} from "../helpers"
import { InputImageSlot } from "./input-image-slot"
import type { ImageEditorController } from "../use-image-editor"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type EditorSidebarProps = {
  controller: ImageEditorController
}

export function EditorSidebar({ controller }: EditorSidebarProps) {
  type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number]

  const isAspectRatioActive = (ratio: AspectRatioOption) =>
    controller.aspectRatio === ratio

  const getAspectRatioButtonWidth = (ratio: AspectRatioOption): number => {
    const BUTTON_HEIGHT_PX = 40
    const MIN_BUTTON_WIDTH_PX = 24
    const width = calculateAspectRatioValue(ratio) * BUTTON_HEIGHT_PX
    return Math.max(MIN_BUTTON_WIDTH_PX, Math.round(width))
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-4 sm:px-6">
      <section>
        <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground">
          Input Images
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {controller.slots.map((slot, index) => (
            <InputImageSlot
              key={`slot-${index + 1}`}
              index={index}
              slot={slot}
              isGenerating={controller.isGenerating}
              onPickImage={controller.onPickImage}
              onRemoveImage={controller.onRemoveImage}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground">
            Prompt
          </h2>
          <Terminal size={14} className="text-muted-foreground" />
        </div>
        <Textarea
          id="prompt"
          value={controller.prompt}
          onChange={(e) => controller.onPromptChange(e.target.value)}
          placeholder="Describe the cinematic atmosphere, lighting details, and subject composition..."
          rows={7}
          className="resize-none border-border/70 bg-background p-4 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/80"
        />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="count"
            className="font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground"
          >
            Number of Images
          </Label>
          <Select
            value={String(controller.generateCount)}
            onValueChange={(value) =>
              controller.onGenerateCountChange(Number(value))
            }
          >
            <SelectTrigger
              id="count"
              className="h-10 bg-secondary/60 font-mono text-xs"
            >
              <SelectValue placeholder="Select count" />
            </SelectTrigger>
            <SelectContent>
              {GENERATE_COUNT_OPTIONS.map((count) => (
                <SelectItem
                  key={count}
                  value={String(count)}
                  className="font-mono text-xs"
                >
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            Aspect Ratio
          </Label>
          <div className="flex flex-wrap items-center gap-1">
            {ASPECT_RATIO_OPTIONS.map((ratio) => (
              <Button
                key={ratio}
                type="button"
                variant={isAspectRatioActive(ratio) ? "default" : "secondary"}
                onClick={() => controller.onAspectRatioChange(ratio)}
                className="h-10 px-0 font-mono text-[9px] tracking-normal"
                style={{ width: `${getAspectRatioButtonWidth(ratio)}px` }}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="upscale-4k"
            checked={controller.isUpscale4kEnabled}
            onCheckedChange={(checked) =>
              controller.onUpscale4kChange(checked === true)
            }
            disabled={controller.isGenerating}
            className="border-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label
            htmlFor="upscale-4k"
            className="font-mono text-[10px] tracking-[0.15em]"
          >
            Upscale 4K
          </Label>
        </div>

        {controller.isDev ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id="mock-mode"
              checked={controller.isMockEnabled}
              onCheckedChange={(checked) =>
                controller.onMockModeChange(checked === true)
              }
              className="border-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <Label
              htmlFor="mock-mode"
              className="font-mono text-[10px] tracking-[0.15em]"
            >
              Mock Mode
            </Label>
          </div>
        ) : null}
      </section>

      <div className="mt-auto border-t border-border/60 pt-5">
        <Button
          type="button"
          onClick={controller.onGenerate}
          disabled={controller.isGenerateDisabled}
          className={`h-12 w-full gap-2 font-mono text-xs font-bold tracking-[0.2em] ${
            controller.isGenerateDisabled
              ? "border border-border bg-muted text-muted-foreground shadow-none hover:opacity-100"
              : "bg-linear-to-br from-primary to-accent text-primary-foreground hover:opacity-90"
          }`}
        >
          {controller.isGenerating ? (
            "Generating..."
          ) : (
            <span className="flex flex-col items-center leading-tight">
              <span className="text-base">GENERATE</span>
              <span className="text-[9px] font-medium tracking-normal normal-case">
                {controller.estimatedGenerateCredits} credits
              </span>
            </span>
          )}
          <WandSparkles size={16} />
        </Button>

        {controller.generateError ? (
          <p className="mt-3 text-xs text-destructive">
            {controller.generateError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
