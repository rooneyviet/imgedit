import { createServerFn } from "@tanstack/react-start"

import {
  downloadAiImageUseCase,
  type DownloadAiImageRequest,
  type DownloadAiImageResponse,
} from "./application/download-ai-image.service"

export type { DownloadAiImageRequest, DownloadAiImageResponse }

export const downloadAiImage = createServerFn({ method: "POST" })
  .inputValidator((input: DownloadAiImageRequest) => input)
  .handler(async ({ data }): Promise<DownloadAiImageResponse> => {
    return downloadAiImageUseCase(data)
  })
