import { runs, tasks } from "@trigger.dev/sdk"

import { requireAuthenticatedUser } from "../auth"
import {
  CREDIT_OPERATION_CODES,
  assertSufficientCredits,
  calculateRequiredCredits,
  chargeCreditsOnSuccess,
} from "../credits"
import {
  UPSCALE_REPLICATE_IMAGE_TASK_ID,
  type UpscaleReplicateImagePayload,
} from "../../../../trigger/upscale-image"
import {
  UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID,
  type UploadInputImagesToR2Result,
} from "../../../../trigger/upload-input-images-to-r2"

export type UpscaleImageRequest = UpscaleReplicateImagePayload & {
  accessToken: string
}

export type UpscaleImageResponse = {
  image: string
  chargedCredits: number
  remainingCredits: number
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error while upscaling image"
}

function toRequest(input: unknown): UpscaleImageRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload")
  }

  const data = input as Partial<UpscaleImageRequest>
  const image = (data.image ?? "").trim()
  const accessToken = (data.accessToken ?? "").trim()

  if (!image) {
    throw new Error("Image is required")
  }

  if (!accessToken) {
    throw new Error("Access token is required")
  }

  return {
    image,
    accessToken,
  }
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

function extractUploadedInputImages(
  output: unknown
): UploadInputImagesToR2Result {
  if (!output || typeof output !== "object") {
    throw new Error("Missing uploaded image output")
  }

  const value = output as {
    inputImages?: unknown
    inputImageObjectKeys?: unknown
  }

  const inputImages = Array.isArray(value.inputImages)
    ? value.inputImages.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
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

function isPublicHttpImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

async function toUploadableInputImage(value: string): Promise<string> {
  if (!isPublicHttpImageUrl(value)) {
    return value
  }

  const response = await fetch(value)
  if (!response.ok) {
    throw new Error(`Failed to download source image (${response.status})`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0) {
    throw new Error("Downloaded source image was empty")
  }

  return bytes.toString("base64")
}

export async function upscaleAiImageUseCase(
  rawInput: unknown
): Promise<UpscaleImageResponse> {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("Missing TRIGGER_SECRET_KEY")
  }

  const input = toRequest(rawInput)
  const user = await requireAuthenticatedUser(input.accessToken)

  const requiredCredits = calculateRequiredCredits([
    {
      code: CREDIT_OPERATION_CODES.UPSCALE_4K,
      quantity: 1,
    },
  ])

  await assertSufficientCredits(user.id, requiredCredits)

  const uploadHandle = await tasks.trigger(UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID, {
    inputImagesDataUrls: [await toUploadableInputImage(input.image)],
    outputFormat: "webp",
    outputQuality: 82,
    maxWidth: 1536,
    maxHeight: 1536,
  })

  const uploadRun = await runs.poll(uploadHandle.id, {
    pollIntervalMs: 1000,
  })

  if (!uploadRun.isSuccess) {
    throw new Error(getErrorMessage(uploadRun.error))
  }

  const uploadedInputImage = extractUploadedInputImages(uploadRun.output)

  const handle = await tasks.trigger(UPSCALE_REPLICATE_IMAGE_TASK_ID, {
    image: uploadedInputImage.inputImages[0] ?? "",
    inputImageObjectKeys: uploadedInputImage.inputImageObjectKeys,
    deleteInputImagesOnSuccess: true,
  })

  const run = await runs.poll(handle.id, {
    pollIntervalMs: 1000,
  })

  if (!run.isSuccess) {
    throw new Error(getErrorMessage(run.error))
  }

  const chargeResult = await chargeCreditsOnSuccess({
    profileId: user.id,
    requiredCredits,
    reason: "Upscale image to 4K",
    operationCode: CREDIT_OPERATION_CODES.UPSCALE_4K,
    metadata: {
      sourceImage: input.image,
    },
  })

  return {
    image: extractRunOutputImageUrl(run.output),
    chargedCredits: requiredCredits,
    remainingCredits: chargeResult.remainingCredits,
  }
}
