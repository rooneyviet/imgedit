import { createServerFn } from "@tanstack/react-start"
import { runs, tasks } from "@trigger.dev/sdk"

import {
  GENERATE_REPLICATE_IMAGE_TASK_ID,
  type GenerateReplicateImagePayload,
} from "../../../trigger/generate-ai-image"

type GenerateImagesRequest = GenerateReplicateImagePayload & {
  count?: number
}

type GenerateImagesResponse = {
  images: string[]
}

const MAX_GENERATED_IMAGES = 8

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unknown error while generating image"
}

function extractRunOutputImageUrl(output: unknown): string {
  if (!output || typeof output !== "object") {
    throw new Error("Missing task output")
  }

  const value = (output as { imageUrl?: unknown }).imageUrl
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Task output did not include imageUrl")
  }

  return value
}

function toRequest(input: unknown): GenerateImagesRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload")
  }

  const data = input as Partial<GenerateImagesRequest>
  const prompt = (data.prompt ?? "").trim()
  const inputImages = Array.isArray(data.inputImages)
    ? data.inputImages.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : []

  if (!prompt) {
    throw new Error("Prompt is required")
  }

  if (inputImages.length === 0) {
    throw new Error("At least one input image URL is required")
  }

  return {
    prompt,
    inputImages,
    count: data.count,
    resolution: data.resolution,
    aspectRatio: data.aspectRatio,
    outputFormat: data.outputFormat,
    outputQuality: data.outputQuality,
    safetyTolerance: data.safetyTolerance,
    promptUpsampling: data.promptUpsampling,
  }
}

export const generateAiImages = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateImagesRequest) => input)
  .handler(async ({ data }): Promise<GenerateImagesResponse> => {
    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error("Missing TRIGGER_SECRET_KEY")
    }

    const input = toRequest(data)
    const count = Math.min(Math.max(input.count ?? 1, 1), MAX_GENERATED_IMAGES)
    const images: string[] = []

    for (let i = 0; i < count; i++) {
      const handle = await tasks.trigger(GENERATE_REPLICATE_IMAGE_TASK_ID, {
        prompt: input.prompt,
        inputImages: input.inputImages,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
        outputFormat: input.outputFormat,
        outputQuality: input.outputQuality,
        safetyTolerance: input.safetyTolerance,
        promptUpsampling: input.promptUpsampling,
      })

      const run = await runs.poll(handle.id, { pollIntervalMs: 1000 })
      if (!run.isSuccess) {
        throw new Error(getErrorMessage(run.error))
      }

      images.push(extractRunOutputImageUrl(run.output))
    }

    return { images }
  })
