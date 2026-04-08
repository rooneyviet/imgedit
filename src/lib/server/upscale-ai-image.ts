import { createServerFn } from "@tanstack/react-start"

import {
  upscaleAiImageUseCase,
  type UpscaleImageRequest,
  type UpscaleImageResponse,
} from "./application/upscale-ai-image.service"

export type { UpscaleImageRequest, UpscaleImageResponse }

export const upscaleAiImage = createServerFn({ method: "POST" })
  .inputValidator((input: UpscaleImageRequest) => input)
  .handler(async ({ data }): Promise<UpscaleImageResponse> => {
    return upscaleAiImageUseCase(data)
  })
