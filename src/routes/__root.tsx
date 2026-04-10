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
import { ThemeToggle } from "@/components/theme-toggle"
import { TopHeaderAuthControls } from "@/components/top-header-auth-controls"
import { Button } from "@/components/ui/button"
import { AppAuthProvider } from "@/features/auth/app-auth-context"
import { AuthDialog } from "@/features/auth/auth-dialog"
import { useAuth } from "@/features/auth/use-auth"
import {
  createAuthProfileSnapshotQueryOptions,
  updateCachedRemainingCredits,
} from "@/features/auth/infrastructure/auth-profile.queries"
import { createPricingCatalogQueryOptions } from "@/features/pricing/infrastructure/pricing.queries"
import type { AppRouterContext } from "@/router"
import { syncUserProfile } from "@/lib/server/sync-user-profile"

const THEME_STORAGE_KEY = "imgedit-theme"
const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const key = "${THEME_STORAGE_KEY}";
  const storedTheme = window.localStorage.getItem(key);
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : prefersDarkMode
      ? "dark"
      : "light";

  document.documentElement.classList.toggle("dark", theme === "dark");
})();`

type Theme = "light" | "dark"

function getThemeFromDocument(): Theme {
  if (typeof document === "undefined") {
    return "light"
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.classList.toggle("dark", theme === "dark")
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

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
  const [theme, setTheme] = useState<Theme>(() => getThemeFromDocument())
  const syncUserProfileServerFn = useServerFn(syncUserProfile)

  const handleThemeChange = useCallback((checked: boolean) => {
    const nextTheme = checked ? "dark" : "light"
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }, [])

  const profileSnapshotQuery = useQuery({
    ...createAuthProfileSnapshotQueryOptions({
      accessToken: auth.accessToken ?? "",
      syncUserProfile: syncUserProfileServerFn,
    }),
    enabled: Boolean(auth.accessToken),
  })
  const pricingCatalogQuery = useQuery(createPricingCatalogQueryOptions())

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

  const profileSnapshot = auth.accessToken
    ? (profileSnapshotQuery.data ?? null)
    : null
  const operationCosts = pricingCatalogQuery.data?.operationCosts

  const userDisplayName =
    profileSnapshot?.userDisplayName ?? auth.userDisplayName
  const userEmail = profileSnapshot?.userEmail ?? auth.userEmail
  const remainingCredits = profileSnapshot?.remainingCredits ?? null
  const normalImageCreditCost =
    profileSnapshot?.normalImageCreditCost ?? operationCosts?.normalImage ?? 0
  const upscale4kCreditCost = operationCosts?.upscale4k ?? 0
  const activePlanCode = profileSnapshot?.activePlanCode ?? null
  const userLabel =
    userDisplayName || userEmail || (auth.isAuthenticated ? "USER" : "GUEST")

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
      upscale4kCreditCost,
      activePlanCode,
      setRemainingCredits,
      openLoginDialog,
    }),
    [
      activePlanCode,
      auth,
      normalImageCreditCost,
      openLoginDialog,
      remainingCredits,
      setRemainingCredits,
      upscale4kCreditCost,
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
            <ThemeToggle
              isDarkMode={theme === "dark"}
              onCheckedChange={handleThemeChange}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Settings"
            >
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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
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
