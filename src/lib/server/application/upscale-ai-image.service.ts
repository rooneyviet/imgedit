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

  const handle = await tasks.trigger(UPSCALE_REPLICATE_IMAGE_TASK_ID, {
    image: input.image,
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
