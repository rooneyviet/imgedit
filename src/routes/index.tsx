import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import { AuthDialog } from "@/features/auth/auth-dialog"
import { useAuth } from "@/features/auth/use-auth"
import type { ImageEditorServices } from "@/features/image-editor/use-image-editor"
import { ImageEditorPage } from "@/features/image-editor/image-editor-page"
import { useImageEditor } from "@/features/image-editor/use-image-editor"

import { downloadAiImage } from "@/lib/server/download-ai-image"
import { generateAiImages } from "@/lib/server/generate-ai-images"
import { syncUserProfile } from "@/lib/server/sync-user-profile"
import { upscaleAiImage } from "@/lib/server/upscale-ai-image"

export const Route = createFileRoute("/")({ component: App })

type SyncedProfile = {
  id: string
  email: string | null
  displayName: string | null
}

function App() {
  const isDev = import.meta.env.DEV
  const auth = useAuth()
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [syncedProfile, setSyncedProfile] = useState<SyncedProfile | null>(null)
  const lastSyncedTokenRef = useRef<string | null>(null)

  const downloadAiImageServerFn = useServerFn(downloadAiImage)
  const generateAiImagesServerFn = useServerFn(generateAiImages)
  const syncUserProfileServerFn = useServerFn(syncUserProfile)
  const upscaleAiImageServerFn = useServerFn(upscaleAiImage)

  useEffect(() => {
    const accessToken = auth.accessToken
    if (!accessToken) {
      lastSyncedTokenRef.current = null
      setSyncedProfile(null)
      return
    }

    if (lastSyncedTokenRef.current === accessToken) {
      return
    }
    lastSyncedTokenRef.current = accessToken

    void syncUserProfileServerFn({
      data: {
        accessToken,
      },
    })
      .then((result) => {
        setSyncedProfile(result.profile)
      })
      .catch(() => {
        setSyncedProfile(null)
      })
  }, [auth.accessToken, syncUserProfileServerFn])

  useEffect(() => {
    if (auth.isAuthenticated) {
      setIsAuthDialogOpen(false)
    }
  }, [auth.isAuthenticated])

  const openLoginDialog = useCallback(() => {
    auth.clearError()
    auth.setMode("login")
    setIsAuthDialogOpen(true)
  }, [auth])

  const services = useMemo<ImageEditorServices>(
    () => ({
      generateImages: async (payload) => {
        if (!auth.accessToken) {
          openLoginDialog()
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
          openLoginDialog()
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
          openLoginDialog()
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
      downloadAiImageServerFn,
      generateAiImagesServerFn,
      openLoginDialog,
      upscaleAiImageServerFn,
    ]
  )

  const controller = useImageEditor({
    isDev,
    services,
    canGenerate: () => Boolean(auth.accessToken),
    onGenerateUnauthorized: openLoginDialog,
  })

  return (
    <>
      <ImageEditorPage
        controller={controller}
      auth={{
          isAuthenticated: auth.isAuthenticated,
          isLoadingSession: auth.isLoadingSession,
          userDisplayName: syncedProfile?.displayName ?? auth.userDisplayName,
          userEmail: syncedProfile?.email ?? auth.userEmail,
          onLogout: auth.signOut,
          onOpenLogin: openLoginDialog,
        }}
      />
      <AuthDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        mode={auth.mode}
        isLoadingSession={auth.isLoadingSession}
        isSubmitting={auth.isSubmitting}
        error={auth.error}
        verificationEmail={auth.verificationEmail}
        onModeChange={(nextMode) => {
          auth.clearError()
          auth.setMode(nextMode)
        }}
        onDismissVerificationNotice={auth.clearVerificationNotice}
        onLogin={auth.signInWithPassword}
        onRegister={auth.signUpWithPassword}
      />
    </>
  )
}
