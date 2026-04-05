import { createServerFn } from "@tanstack/react-start"
import { runs, tasks } from "@trigger.dev/sdk"

import {
  UPSCALE_REPLICATE_IMAGE_TASK_ID,
  type UpscaleReplicateImagePayload,
} from "../../../trigger/upscale-image"

type UpscaleImageResponse = {
  image: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unknown error while upscaling image"
}

function toRequest(input: unknown): UpscaleReplicateImagePayload {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload")
  }

  const data = input as Partial<UpscaleReplicateImagePayload>
  const image = (data.image ?? "").trim()
  if (!image) {
    throw new Error("Image is required")
  }

  return { image }
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

export const upscaleAiImage = createServerFn({ method: "POST" })
  .inputValidator((input: UpscaleReplicateImagePayload) => input)
  .handler(async ({ data }): Promise<UpscaleImageResponse> => {
    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error("Missing TRIGGER_SECRET_KEY")
    }

    const input = toRequest(data)
    const handle = await tasks.trigger(UPSCALE_REPLICATE_IMAGE_TASK_ID, input)
    const run = await runs.poll(handle.id, { pollIntervalMs: 1000 })

    if (!run.isSuccess) {
      throw new Error(getErrorMessage(run.error))
    }

    return {
      image: extractRunOutputImageUrl(run.output),
    }
  })
