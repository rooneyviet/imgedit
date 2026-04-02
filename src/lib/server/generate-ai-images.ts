import { createServerFn } from "@tanstack/react-start"
import { runs, tasks } from "@trigger.dev/sdk"

import {
  GENERATE_REPLICATE_IMAGE_TASK_ID,
  type GenerateReplicateImagePayload,
} from "../../../trigger/generate-ai-image"
import {
  UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID,
  type UploadInputImagesToR2Result,
} from "../../../trigger/upload-input-images-to-r2"

type GenerateImagesRequest = Omit<
  GenerateReplicateImagePayload,
  "inputImages" | "inputImageObjectKeys" | "deleteInputImagesOnSuccess"
> & {
  count?: number
  inputImagesDataUrls: string[]
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
  const inputImagesDataUrls = Array.isArray(data.inputImagesDataUrls)
    ? data.inputImagesDataUrls.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : []

  if (!prompt) {
    throw new Error("Prompt is required")
  }

  if (inputImagesDataUrls.length === 0) {
    throw new Error("At least one uploaded image is required")
  }

  return {
    prompt,
    inputImagesDataUrls,
    count: data.count,
    resolution: data.resolution,
    aspectRatio: data.aspectRatio,
    outputFormat: data.outputFormat,
    outputQuality: data.outputQuality,
    safetyTolerance: data.safetyTolerance,
    promptUpsampling: data.promptUpsampling,
  }
}

function extractUploadedInputImages(output: unknown): UploadInputImagesToR2Result {
  if (!output || typeof output !== "object") {
    throw new Error("Missing uploaded image output")
  }

  const value = output as {
    inputImages?: unknown
    inputImageObjectKeys?: unknown
  }

  const inputImages = Array.isArray(value.inputImages)
    ? value.inputImages.filter((item): item is string => typeof item === "string" && item.length > 0)
    : []
  const inputImageObjectKeys = Array.isArray(value.inputImageObjectKeys)
    ? value.inputImageObjectKeys.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
    : []

  if (inputImages.length === 0) {
    throw new Error("Uploaded images did not include URLs")
  }

  return {
    inputImages,
    inputImageObjectKeys,
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
    const uploadHandle = await tasks.trigger(UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID, {
      inputImagesDataUrls: input.inputImagesDataUrls,
      outputFormat: "webp",
      outputQuality: 82,
      maxWidth: 1536,
      maxHeight: 1536,
    })

    const uploadRun = await runs.poll(uploadHandle.id, { pollIntervalMs: 1000 })
    if (!uploadRun.isSuccess) {
      throw new Error(getErrorMessage(uploadRun.error))
    }

    const uploadedInputImages = extractUploadedInputImages(uploadRun.output)

    for (let i = 0; i < count; i++) {
      const handle = await tasks.trigger(GENERATE_REPLICATE_IMAGE_TASK_ID, {
        prompt: input.prompt,
        inputImages: uploadedInputImages.inputImages,
        inputImageObjectKeys: uploadedInputImages.inputImageObjectKeys,
        deleteInputImagesOnSuccess: i === count - 1,
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
