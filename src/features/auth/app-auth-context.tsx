import { createContext, useContext } from "react"
import type { ReactNode } from "react"

import type { AuthMode, RegisterPayload } from "./use-auth"

type AppAuthContextValue = {
  mode: AuthMode
  setMode: (mode: AuthMode) => void
  error: string | null
  clearError: () => void
  verificationEmail: string | null
  clearVerificationNotice: () => void
  isLoadingSession: boolean
  isSubmitting: boolean
  isAuthenticated: boolean
  accessToken: string | null
  userEmail: string | null
  userDisplayName: string | null
  remainingCredits: number | null
  normalImageCreditCost: number
  upscale4kCreditCost: number
  setRemainingCredits: (remainingCredits: number) => void
  signInWithPassword: (payload: { email: string; password: string }) => Promise<boolean>
  signUpWithPassword: (payload: RegisterPayload) => Promise<boolean>
  signOut: () => Promise<void>
  openLoginDialog: () => void
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null)

export function AppAuthProvider({
  value,
  children,
}: {
  value: AppAuthContextValue
  children: ReactNode
}) {
  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
}

export function useAppAuth() {
  const context = useContext(AppAuthContext)
  if (!context) {
    throw new Error("useAppAuth must be used within AppAuthProvider")
  }
  return context
}
