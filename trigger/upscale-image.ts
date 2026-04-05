import Replicate from "replicate"
import type { Prediction } from "replicate"
import { task, wait } from "@trigger.dev/sdk"

export type UpscaleReplicateImagePayload = {
  image: string
}

export type UpscaleReplicateImageResult = {
  imageUrl: string
}

const UPSCALE_MODEL = "recraft-ai/recraft-crisp-upscale"
export const UPSCALE_REPLICATE_IMAGE_TASK_ID = "upscale-replicate-image"

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

export const upscaleReplicateImageTask = task({
  id: UPSCALE_REPLICATE_IMAGE_TASK_ID,
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: UpscaleReplicateImagePayload
  ): Promise<UpscaleReplicateImageResult> => {
    const apiToken = process.env.REPLICATE_API_TOKEN
    if (!apiToken) {
      throw new Error("Missing REPLICATE_API_TOKEN")
    }

    const image = payload.image.trim()
    if (!image) {
      throw new Error("Image is required")
    }

    const replicate = new Replicate({ auth: apiToken })
    const token = await wait.createToken({
      timeout: "10m",
    })

    await replicate.predictions.create({
      model: UPSCALE_MODEL,
      input: {
        image,
      },
      webhook: token.url,
      webhook_events_filter: ["completed"],
    })

    const result = await wait.forToken<Prediction>(token)
    if (!result.ok) {
      throw new Error("Replicate prediction failed")
    }

    return {
      imageUrl: extractImageUrl(result.output.output),
    }
  },
})
