import Replicate from "replicate"
import { task } from "@trigger.dev/sdk"

export type GenerateReplicateImagePayload = {
  prompt: string
  inputImages: string[]
  resolution?: "0.25 MP" | "0.5 MP" | "1 MP"
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:4" | "4:3"
  outputFormat?: "jpg" | "png" | "webp"
  outputQuality?: number
  safetyTolerance?: number
  promptUpsampling?: boolean
}

export type GenerateReplicateImageResult = {
  imageUrl: string
}

const MODEL = "black-forest-labs/flux-2-pro"

function extractImageUrl(output: unknown): string {
  if (typeof output === "string" && output.length > 0) {
    return output
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      try {
        return extractImageUrl(item)
      } catch {
        continue
      }
    }
  }

  if (output && typeof output === "object") {
    const record = output as { url?: unknown }

    if (typeof record.url === "string" && record.url.length > 0) {
      return record.url
    }

    if (typeof record.url === "function") {
      const url = record.url()
      if (typeof url === "string" && url.length > 0) {
        return url
      }
    }
  }

  throw new Error("Replicate response did not contain an image URL")
}

export const generateReplicateImageTask = task({
  id: "generate-replicate-image",
  run: async (payload: GenerateReplicateImagePayload): Promise<GenerateReplicateImageResult> => {
    const apiToken = process.env.REPLICATE_API_TOKEN
    if (!apiToken) {
      throw new Error("Missing REPLICATE_API_TOKEN")
    }

    if (!payload.prompt.trim()) {
      throw new Error("Prompt is required")
    }

    if (payload.inputImages.length === 0) {
      throw new Error("At least one input image URL is required")
    }

    const replicate = new Replicate({ auth: apiToken })
    const output = await replicate.run(MODEL, {
      input: {
        prompt: payload.prompt,
        resolution: payload.resolution ?? "1 MP",
        aspect_ratio: payload.aspectRatio ?? "3:4",
        input_images: payload.inputImages,
        output_format: payload.outputFormat ?? "jpg",
        output_quality: payload.outputQuality ?? 80,
        safety_tolerance: payload.safetyTolerance ?? 2,
        prompt_upsampling: payload.promptUpsampling ?? false,
      },
    })

    return {
      imageUrl: extractImageUrl(output),
    }
  },
})
