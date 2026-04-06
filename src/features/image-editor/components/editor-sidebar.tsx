import { Upload } from "lucide-react"

import {
  ASPECT_RATIO_OPTIONS,
  GENERATE_COUNT_OPTIONS,
} from "../helpers"
import { InputImageSlot } from "./input-image-slot"
import type { ImageEditorController } from "../use-image-editor"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

  return (
    <Card className="bg-white/85 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">IMG Edit</CardTitle>
        <CardDescription>Edit your images</CardDescription>
      </CardHeader>

      <CardContent>
        <section>
          <h2 className="text-sm font-medium text-slate-900">Input Images</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
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

        <section className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={controller.prompt}
              onChange={(e) => controller.onPromptChange(e.target.value)}
              placeholder="Enter your prompt here. Please be specific about the edits you want to see on the input image(s). For example: 'Make the image look like it was taken during sunset, with warm tones and long shadows.'"
              rows={6}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="count">How many images to generate</Label>
            <Select
              value={String(controller.generateCount)}
              onValueChange={(value) =>
                controller.onGenerateCountChange(Number(value))
              }
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
              value={controller.aspectRatio}
              onValueChange={(value) =>
                controller.onAspectRatioChange(value as AspectRatioOption)
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

          {controller.isDev ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="mock-mode"
                checked={controller.isMockEnabled}
                onCheckedChange={(checked) =>
                  controller.onMockModeChange(checked === true)
                }
              />
              <Label htmlFor="mock-mode">Mock</Label>
            </div>
          ) : null}

          <Button
            type="button"
            onClick={controller.onGenerate}
            disabled={controller.isGenerateDisabled}
            className="mt-1 flex w-full items-center gap-2"
          >
            <Upload size={16} />
            {controller.isGenerating ? "Generating..." : "Generate"}
          </Button>

          {controller.generateError ? (
            <p className="text-sm text-red-600">{controller.generateError}</p>
          ) : null}
        </section>
      </CardContent>
    </Card>
  )
}
