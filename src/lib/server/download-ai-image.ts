/**
 * Downloads a remote image and converts it to a base64 payload.
 * @param {DownloadAiImageRequest} data - Request payload with the source `imageUrl`.
 * @returns {Promise<DownloadAiImageResponse>} Base64 image content and detected content type.
 */
import { createServerFn } from "@tanstack/react-start"

type DownloadAiImageRequest = {
  imageUrl: string
}

type DownloadAiImageResponse = {
  base64: string
  contentType: string
}

function toRequest(input: unknown): DownloadAiImageRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload")
  }

  const data = input as Partial<DownloadAiImageRequest>
  const imageUrl = (data.imageUrl ?? "").trim()

  if (!imageUrl) {
    throw new Error("Image URL is required")
  }

  return { imageUrl }
}

export const downloadAiImage = createServerFn({ method: "POST" })
  .inputValidator((input: DownloadAiImageRequest) => input)
  .handler(async ({ data }): Promise<DownloadAiImageResponse> => {
    const input = toRequest(data)
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
  })
