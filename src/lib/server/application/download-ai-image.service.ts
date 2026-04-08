import { requireAuthenticatedUser } from "../auth"

export type DownloadAiImageRequest = {
  imageUrl: string
  accessToken: string
}

export type DownloadAiImageResponse = {
  base64: string
  contentType: string
}

function toRequest(input: unknown): DownloadAiImageRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload")
  }

  const data = input as Partial<DownloadAiImageRequest>
  const imageUrl = (data.imageUrl ?? "").trim()
  const accessToken = (data.accessToken ?? "").trim()

  if (!imageUrl) {
    throw new Error("Image URL is required")
  }

  if (!accessToken) {
    throw new Error("Access token is required")
  }

  return {
    imageUrl,
    accessToken,
  }
}

export async function downloadAiImageUseCase(
  rawInput: unknown
): Promise<DownloadAiImageResponse> {
  const input = toRequest(rawInput)

  await requireAuthenticatedUser(input.accessToken)

  const response = await fetch(input.imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`)
  }

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream"

  const buffer = Buffer.from(await response.arrayBuffer())

  return {
    base64: buffer.toString("base64"),
    contentType,
  }
}
