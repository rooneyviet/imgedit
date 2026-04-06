/**
 * Downloads a remote image and converts it to a base64 payload.
 * @param {DownloadAiImageRequest} data - Request payload with the source `imageUrl`.
 * @returns {Promise<DownloadAiImageResponse>} Base64 image content and detected content type.
 */
import { createServerFn } from "@tanstack/react-start"

import { requireAuthenticatedUser } from "./auth"

type DownloadAiImageRequest = {
  imageUrl: string
  accessToken: string
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
  const accessToken = (data.accessToken ?? "").trim()

  if (!imageUrl) {
    throw new Error("Image URL is required")
  }
  if (!accessToken) {
    throw new Error("Access token is required")
  }

  return { imageUrl, accessToken }
}

export const downloadAiImage = createServerFn({ method: "POST" })
  .inputValidator((input: DownloadAiImageRequest) => input)
  .handler(async ({ data }): Promise<DownloadAiImageResponse> => {
    const input = toRequest(data)
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
  })
