import { useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import type { ImageEditorServices } from "@/features/image-editor/use-image-editor"
import { useAppAuth } from "@/features/auth/app-auth-context"
import { ImageEditorPage } from "@/features/image-editor/image-editor-page"
import { useImageEditor } from "@/features/image-editor/use-image-editor"

import { downloadAiImage } from "@/lib/server/download-ai-image"
import { generateAiImages } from "@/lib/server/generate-ai-images"
import { upscaleAiImage } from "@/lib/server/upscale-ai-image"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const isDev = import.meta.env.DEV
  const auth = useAppAuth()

  const downloadAiImageServerFn = useServerFn(downloadAiImage)
  const generateAiImagesServerFn = useServerFn(generateAiImages)
  const upscaleAiImageServerFn = useServerFn(upscaleAiImage)

  const services = useMemo<ImageEditorServices>(
    () => ({
      generateImages: async (payload) => {
        if (!auth.accessToken) {
          auth.openLoginDialog()
          throw new Error("Please sign in to continue")
        }
        return generateAiImagesServerFn({
          data: {
            ...payload,
            accessToken: auth.accessToken,
          },
        })
      },
      upscaleImage: async (payload) => {
        if (!auth.accessToken) {
          auth.openLoginDialog()
          throw new Error("Please sign in to continue")
        }
        return upscaleAiImageServerFn({
          data: {
            ...payload,
            accessToken: auth.accessToken,
          },
        })
      },
      downloadImage: async (payload) => {
        if (!auth.accessToken) {
          auth.openLoginDialog()
          throw new Error("Please sign in to continue")
        }
        return downloadAiImageServerFn({
          data: {
            ...payload,
            accessToken: auth.accessToken,
          },
        })
      },
    }),
    [
      auth.accessToken,
      auth.openLoginDialog,
      downloadAiImageServerFn,
      generateAiImagesServerFn,
      upscaleAiImageServerFn,
    ]
  )

  const controller = useImageEditor({
    isDev,
    services,
    normalImageCreditCost: auth.normalImageCreditCost,
    onCreditsUpdated: auth.setRemainingCredits,
    canGenerate: () => Boolean(auth.accessToken),
    onGenerateUnauthorized: auth.openLoginDialog,
  })

  return (
    <ImageEditorPage
      controller={controller}
      auth={{
        isAuthenticated: auth.isAuthenticated,
        userDisplayName: auth.userDisplayName,
        userEmail: auth.userEmail,
      }}
    />
  )
}
