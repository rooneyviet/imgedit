import { createFileRoute } from "@tanstack/react-router"

import { useAppAuth } from "@/features/auth/app-auth-context"
import { ImageEditorPage } from "@/features/image-editor/image-editor-page"
import { useImageEditorServerServices } from "@/features/image-editor/infrastructure/image-editor.server-services"
import { useImageEditor } from "@/features/image-editor/use-image-editor"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const isDev = import.meta.env.DEV
  const auth = useAppAuth()

  const services = useImageEditorServerServices({
    accessToken: auth.accessToken,
    onUnauthorized: auth.openLoginDialog,
  })

  const controller = useImageEditor({
    isDev,
    services,
    normalImageCreditCost: auth.normalImageCreditCost,
    upscale4kCreditCost: auth.upscale4kCreditCost,
    onCreditsUpdated: auth.setRemainingCredits,
    canGenerate: () => Boolean(auth.accessToken),
    onGenerateUnauthorized: auth.openLoginDialog,
  })

  return (
    <ImageEditorPage controller={controller} />
  )
}
