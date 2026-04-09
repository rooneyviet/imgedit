import { runs, tasks } from "@trigger.dev/sdk"

import { requireAuthenticatedUser } from "../auth"
import {
  CREDIT_OPERATION_CODES,
  assertSufficientCredits,
  calculateRequiredCredits,
  chargeCreditsOnSuccess,
} from "../credits"
import {
  GENERATE_REPLICATE_IMAGE_TASK_ID,
  type GenerateReplicateImagePayload,
} from "../../../../trigger/generate-ai-image"
import {
  UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID,
  type UploadInputImagesToR2Result,
} from "../../../../trigger/upload-input-images-to-r2"

export type GenerateImagesRequest = Omit<
  GenerateReplicateImagePayload,
  "inputImages" | "inputImageObjectKeys" | "deleteInputImagesOnSuccess"
> & {
  count?: number
  mock?: boolean
  inputImagesDataUrlsOrUrls: string[]
  accessToken: string
}

export type GenerateImagesResponse = {
  images: string[]
  chargedCredits: number
  remainingCredits: number
}

const MAX_GENERATED_IMAGES = 8
const MOCK_IMAGE_URL =
  "https://replicate.delivery/xezq/zaOfqr5zXKVEUCLKy1cmunmnR6jYSfgTE0xDjd8wq6k36CYWA/tmpbnnkh81q.webp"
const MOCK_DELAY_MS = 3000

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error while generating image"
}

function toRequest(input: unknown): GenerateImagesRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload")
  }

  const data = input as Partial<GenerateImagesRequest> & {
    inputImagesDataUrls?: string[]
  }

  const prompt = (data.prompt ?? "").trim()
  const rawInputImages = Array.isArray(data.inputImagesDataUrlsOrUrls)
    ? data.inputImagesDataUrlsOrUrls
    : Array.isArray(data.inputImagesDataUrls)
      ? data.inputImagesDataUrls
      : []

  const inputImagesDataUrlsOrUrls = rawInputImages.filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0
  )

  if (!prompt) {
    throw new Error("Prompt is required")
  }

  if (inputImagesDataUrlsOrUrls.length === 0) {
    throw new Error("At least one input image is required")
  }

  return {
    prompt,
    inputImagesDataUrlsOrUrls,
    accessToken: (data.accessToken ?? "").trim(),
    count: data.count,
    mock: data.mock === true,
    goFast: data.goFast,
    megapixels: data.megapixels,
    aspectRatio: data.aspectRatio,
    outputFormat: data.outputFormat,
    outputQuality: data.outputQuality,
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

export async function generateAiImagesUseCase(
  rawInput: unknown
): Promise<GenerateImagesResponse> {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("Missing TRIGGER_SECRET_KEY")
  }

  const input = toRequest(rawInput)

  const user = await requireAuthenticatedUser(input.accessToken)
  const count = Math.min(Math.max(input.count ?? 1, 1), MAX_GENERATED_IMAGES)
  const requiredCredits = calculateRequiredCredits([
    {
      code: CREDIT_OPERATION_CODES.NORMAL_IMAGE,
      quantity: count,
    },
  ])

  await assertSufficientCredits(user.id, requiredCredits)

  if (process.env.NODE_ENV === "development" && input.mock) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

    const chargeResult = await chargeCreditsOnSuccess({
      profileId: user.id,
      requiredCredits,
      reason: "Generate normal images",
      operationCode: CREDIT_OPERATION_CODES.NORMAL_IMAGE,
      metadata: {
        count,
        mock: true,
      },
    })

    return {
      images: Array.from({ length: count }, () => MOCK_IMAGE_URL),
      chargedCredits: requiredCredits,
      remainingCredits: chargeResult.remainingCredits,
    }
  }

  const directInputImages: string[] = []
  const uploadableInputImagesDataUrls: string[] = []

  for (const inputImage of input.inputImagesDataUrlsOrUrls) {
    if (isPublicHttpImageUrl(inputImage)) {
      directInputImages.push(inputImage)
    } else {
      uploadableInputImagesDataUrls.push(inputImage)
    }
  }

  let uploadedInputImages: UploadInputImagesToR2Result = {
    inputImages: [],
    inputImageObjectKeys: [],
  }

  if (uploadableInputImagesDataUrls.length > 0) {
    const uploadHandle = await tasks.trigger(
      UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID,
      {
        inputImagesDataUrls: uploadableInputImagesDataUrls,
        outputFormat: "webp",
        outputQuality: 82,
        maxWidth: 1536,
        maxHeight: 1536,
      }
    )

    const uploadRun = await runs.poll(uploadHandle.id, {
      pollIntervalMs: 1000,
    })

    if (!uploadRun.isSuccess) {
      throw new Error(getErrorMessage(uploadRun.error))
    }

    uploadedInputImages = extractUploadedInputImages(uploadRun.output)
  }

  const inputImages = [...directInputImages, ...uploadedInputImages.inputImages]
  const images: string[] = []

  for (let index = 0; index < count; index++) {
    const handle = await tasks.trigger(GENERATE_REPLICATE_IMAGE_TASK_ID, {
      prompt: input.prompt,
      inputImages,
      inputImageObjectKeys: uploadedInputImages.inputImageObjectKeys,
      deleteInputImagesOnSuccess: index === count - 1,
      goFast: input.goFast,
      megapixels: input.megapixels,
      aspectRatio: input.aspectRatio,
      outputFormat: input.outputFormat,
      outputQuality: input.outputQuality,
    })

    const run = await runs.poll(handle.id, {
      pollIntervalMs: 1000,
    })

    if (!run.isSuccess) {
      throw new Error(getErrorMessage(run.error))
    }

    images.push(extractRunOutputImageUrl(run.output))
  }

  const chargeResult = await chargeCreditsOnSuccess({
    profileId: user.id,
    requiredCredits,
    reason: "Generate normal images",
    operationCode: CREDIT_OPERATION_CODES.NORMAL_IMAGE,
    metadata: {
      count,
      mock: false,
    },
  })

  return {
    images,
    chargedCredits: requiredCredits,
    remainingCredits: chargeResult.remainingCredits,
  }
}
