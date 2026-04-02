import { createServerFn } from "@tanstack/react-start"

import {
  type GenerateReplicateImagePayload,
  generateReplicateImageTask,
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
      const run = await generateReplicateImageTask.triggerAndWait({
        prompt: input.prompt,
        inputImages: input.inputImages,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
        outputFormat: input.outputFormat,
        outputQuality: input.outputQuality,
        safetyTolerance: input.safetyTolerance,
        promptUpsampling: input.promptUpsampling,
      })

      if (!run.ok) {
        throw new Error(getErrorMessage(run.error))
      }

      images.push(run.output.imageUrl)
    }

    return { images }
  })
