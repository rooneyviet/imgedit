import { Terminal, WandSparkles } from "lucide-react"

import { ASPECT_RATIO_OPTIONS, GENERATE_COUNT_OPTIONS } from "../helpers"
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

const QUICK_ASPECT_RATIOS = ["1:1", "4:3", "16:9"] as const

export function EditorSidebar({ controller }: EditorSidebarProps) {
  type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number]

  const isQuickRatioActive = (ratio: string) => controller.aspectRatio === ratio

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-6">
      <section>
        <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          INPUT_IMAGES
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
            PROMPT_ENGINE
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
        <div className="space-y-3">
          <Label
            htmlFor="count"
            className="font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase"
          >
            NUM_IMAGES
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

        <div className="space-y-3">
          <Label className="font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
            ASPECT_RATIO
          </Label>
          <div className="grid grid-cols-3 gap-1">
            {QUICK_ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio}
                type="button"
                variant={isQuickRatioActive(ratio) ? "default" : "secondary"}
                onClick={() =>
                  controller.onAspectRatioChange(ratio as AspectRatioOption)
                }
                className="h-8 font-mono text-[10px] tracking-wider"
              >
                {ratio}
              </Button>
            ))}
          </div>

          <Select
            value={controller.aspectRatio}
            onValueChange={(value) =>
              controller.onAspectRatioChange(value as AspectRatioOption)
            }
          >
            <SelectTrigger
              id="aspect-ratio"
              className="h-9 bg-secondary/50 font-mono text-[10px] tracking-widest"
            >
              <SelectValue placeholder="All ratios" />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIO_OPTIONS.map((ratio) => (
                <SelectItem
                  key={ratio}
                  value={ratio}
                  className="font-mono text-xs"
                >
                  {ratio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {controller.isDev ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id="mock-mode"
              checked={controller.isMockEnabled}
              onCheckedChange={(checked) =>
                controller.onMockModeChange(checked === true)
              }
            />
            <Label
              htmlFor="mock-mode"
              className="font-mono text-[10px] tracking-[0.15em] uppercase"
            >
              MOCK_MODE
            </Label>
          </div>
        ) : null}
      </section>

      <div className="mt-auto border-t border-border/60 pt-5">
        <Button
          type="button"
          onClick={controller.onGenerate}
          disabled={controller.isGenerateDisabled}
          className={`h-12 w-full gap-2 font-mono text-xs font-bold tracking-[0.2em] uppercase ${
            controller.isGenerateDisabled
              ? "border border-border bg-zinc-200 text-zinc-500 shadow-none hover:opacity-100"
              : "bg-linear-to-br from-primary to-fuchsia-500 text-primary-foreground hover:opacity-90"
          }`}
        >
          {controller.isGenerating ? (
            "GENERATING..."
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
