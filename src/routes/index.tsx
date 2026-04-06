import { useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import type { ImageEditorServices } from "@/features/image-editor/use-image-editor"
import { ImageEditorPage } from "@/features/image-editor/image-editor-page"
import { useImageEditor } from "@/features/image-editor/use-image-editor"

import { downloadAiImage } from "@/lib/server/download-ai-image"
import { generateAiImages } from "@/lib/server/generate-ai-images"
import { upscaleAiImage } from "@/lib/server/upscale-ai-image"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const isDev = import.meta.env.DEV
  const downloadAiImageServerFn = useServerFn(downloadAiImage)
  const generateAiImagesServerFn = useServerFn(generateAiImages)
  const upscaleAiImageServerFn = useServerFn(upscaleAiImage)

  const services = useMemo<ImageEditorServices>(
    () => ({
      generateImages: async (payload) => generateAiImagesServerFn({ data: payload }),
      upscaleImage: async (payload) => upscaleAiImageServerFn({ data: payload }),
      downloadImage: async (payload) => downloadAiImageServerFn({ data: payload }),
    }),
    [downloadAiImageServerFn, generateAiImagesServerFn, upscaleAiImageServerFn]
  )

  const controller = useImageEditor({
    isDev,
    services,
  })

  return <ImageEditorPage controller={controller} />
}
