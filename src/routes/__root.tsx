import { useCallback, useEffect, useMemo, useState } from "react"
import { CircleHelp, Settings } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { useServerFn } from "@tanstack/react-start"

import appCss from "../styles.css?url"

import { AppTopHeader } from "@/components/app-top-header"
import { TopHeaderAuthControls } from "@/components/top-header-auth-controls"
import { Button } from "@/components/ui/button"
import { AppAuthProvider } from "@/features/auth/app-auth-context"
import { AuthDialog } from "@/features/auth/auth-dialog"
import { useAuth } from "@/features/auth/use-auth"
import {
  createAuthProfileSnapshotQueryOptions,
  updateCachedRemainingCredits,
} from "@/features/auth/infrastructure/auth-profile.queries"
import type { AppRouterContext } from "@/router"
import { syncUserProfile } from "@/lib/server/sync-user-profile"

export const Route = createRootRouteWithContext<AppRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "IMG Edit",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const isDev = import.meta.env.DEV
  const queryClient = useQueryClient()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeTab = pathname === "/pricing" ? "pricing" : "gallery"
  const auth = useAuth()
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const syncUserProfileServerFn = useServerFn(syncUserProfile)

  const profileSnapshotQuery = useQuery({
    ...createAuthProfileSnapshotQueryOptions({
      accessToken: auth.accessToken ?? "",
      syncUserProfile: syncUserProfileServerFn,
    }),
    enabled: Boolean(auth.accessToken),
  })

  useEffect(() => {
    if (!profileSnapshotQuery.error || !isDev) {
      return
    }

    console.warn("Failed to sync user profile", profileSnapshotQuery.error)
  }, [isDev, profileSnapshotQuery.error])

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

  const profileSnapshot = auth.accessToken ? (profileSnapshotQuery.data ?? null) : null

  const userDisplayName = profileSnapshot?.userDisplayName ?? auth.userDisplayName
  const userEmail = profileSnapshot?.userEmail ?? auth.userEmail
  const remainingCredits = profileSnapshot?.remainingCredits ?? null
  const normalImageCreditCost = profileSnapshot?.normalImageCreditCost ?? 3
  const userLabel = userDisplayName || userEmail || (auth.isAuthenticated ? "USER" : "GUEST")

  const setRemainingCredits = useCallback(
    (nextRemainingCredits: number) => {
      updateCachedRemainingCredits({
        queryClient,
        accessToken: auth.accessToken,
        remainingCredits: nextRemainingCredits,
      })
    },
    [auth.accessToken, queryClient]
  )

  const authContextValue = useMemo(
    () => ({
      ...auth,
      userDisplayName,
      userEmail,
      remainingCredits,
      normalImageCreditCost,
      setRemainingCredits,
      openLoginDialog,
    }),
    [
      auth,
      normalImageCreditCost,
      openLoginDialog,
      remainingCredits,
      setRemainingCredits,
      userDisplayName,
      userEmail,
    ]
  )

  return (
    <AppAuthProvider value={authContextValue}>
      <AppTopHeader
        activeTab={activeTab}
        rightSlot={
          <>
            <Button type="button" size="icon" variant="ghost" aria-label="Settings">
              <Settings size={16} />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Help">
              <CircleHelp size={16} />
            </Button>
            <TopHeaderAuthControls
              isAuthenticated={auth.isAuthenticated}
              isLoadingSession={auth.isLoadingSession}
              userLabel={userLabel}
              remainingCredits={remainingCredits}
              onLogout={() => {
                void auth.signOut()
              }}
              onOpenLogin={openLoginDialog}
            />
          </>
        }
      />
      <Outlet />
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
    </AppAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
