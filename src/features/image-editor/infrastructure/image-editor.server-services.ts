import { useMemo } from "react"
import { useServerFn } from "@tanstack/react-start"

import type { ImageEditorServices } from "@/features/image-editor/use-image-editor"
import { downloadAiImage } from "@/lib/server/download-ai-image"
import { generateAiImages } from "@/lib/server/generate-ai-images"
import { upscaleAiImage } from "@/lib/server/upscale-ai-image"

export type UseImageEditorServerServicesOptions = {
  accessToken: string | null
  onUnauthorized: () => void
}

function requireAccessToken(
  accessToken: string | null,
  onUnauthorized: () => void
): string {
  if (accessToken) {
    return accessToken
  }

  onUnauthorized()
  throw new Error("Please sign in to continue")
}

export function useImageEditorServerServices({
  accessToken,
  onUnauthorized,
}: UseImageEditorServerServicesOptions): ImageEditorServices {
  const downloadAiImageServerFn = useServerFn(downloadAiImage)
  const generateAiImagesServerFn = useServerFn(generateAiImages)
  const upscaleAiImageServerFn = useServerFn(upscaleAiImage)

  return useMemo<ImageEditorServices>(() => {
    return {
      generateImages: async (payload) => {
        const token = requireAccessToken(accessToken, onUnauthorized)

        return generateAiImagesServerFn({
          data: {
            ...payload,
            accessToken: token,
          },
        })
      },
      upscaleImage: async (payload) => {
        const token = requireAccessToken(accessToken, onUnauthorized)

        return upscaleAiImageServerFn({
          data: {
            ...payload,
            accessToken: token,
          },
        })
      },
      downloadImage: async (payload) => {
        const token = requireAccessToken(accessToken, onUnauthorized)

        return downloadAiImageServerFn({
          data: {
            ...payload,
            accessToken: token,
          },
        })
      },
    }
  }, [
    accessToken,
    downloadAiImageServerFn,
    generateAiImagesServerFn,
    onUnauthorized,
    upscaleAiImageServerFn,
  ])
}
