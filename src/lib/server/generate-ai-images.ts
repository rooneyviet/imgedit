import { createServerFn } from "@tanstack/react-start"

import {
  generateAiImagesUseCase,
  type GenerateImagesRequest,
  type GenerateImagesResponse,
} from "./application/generate-ai-images.service"

export type { GenerateImagesRequest, GenerateImagesResponse }

export const generateAiImages = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateImagesRequest) => input)
  .handler(async ({ data }): Promise<GenerateImagesResponse> => {
    return generateAiImagesUseCase(data)
  })
