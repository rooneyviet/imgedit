import { useCallback, useEffect, useMemo, useState } from "react"
import { GoTrueClient, type Session, type User } from "@supabase/auth-js"

export type AuthMode = "login" | "register"

export type RegisterPayload = {
  displayName: string
  email: string
  password: string
}

type LoginPayload = {
  email: string
  password: string
}

const AUTH_STORAGE_KEY = "imgedit-auth-session"

function getAuthUrl(): string {
  return import.meta.env.VITE_SUPABASE_AUTH_URL || "http://localhost:9999"
}

function formatAuthError(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message.includes("JSON.parse") ||
      error.message.includes("Unexpected token")
    ) {
      return `Auth endpoint returned a non-JSON response. Check VITE_SUPABASE_AUTH_URL (${getAuthUrl()}) and reverse-proxy routing.`
    }

    return error.message
  }

  return "Unexpected auth error"
}

function parseDisplayName(user: User | null): string | null {
  const metadata = user?.user_metadata
  if (!metadata || typeof metadata !== "object") {
    return null
  }

  const displayName = metadata["display_name"]
  if (typeof displayName === "string" && displayName.trim().length > 0) {
    return displayName.trim()
  }

  const fullName = metadata["full_name"]
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim()
  }

  return null
}

export function useAuth() {
  const [client, setClient] = useState<GoTrueClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<AuthMode>("login")
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  useEffect(() => {
    const authClient = new GoTrueClient({
      url: getAuthUrl(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: AUTH_STORAGE_KEY,
    })
    setClient(authClient)

    let disposed = false
    void authClient
      .getSession()
      .then(({ data, error: getSessionError }) => {
        if (disposed) {
          return
        }
        if (getSessionError) {
          setError(getSessionError.message)
        }
        setSession(data.session ?? null)
        setUser(data.session?.user ?? null)
      })
      .finally(() => {
        if (!disposed) {
          setIsLoadingSession(false)
        }
      })

    const {
      data: { subscription },
    } = authClient.onAuthStateChange((_event, nextSession) => {
      if (disposed) {
        return
      }
      setSession(nextSession ?? null)
      setUser(nextSession?.user ?? null)
      if (nextSession) {
        setError(null)
        setVerificationEmail(null)
      }
    })

    return () => {
      disposed = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(
    async ({ email, password }: LoginPayload): Promise<boolean> => {
      if (!client) {
        setError("Auth client is not ready yet")
        return false
      }

      setIsSubmitting(true)
      setError(null)

      try {
        const { data, error: signInError } = await client.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) {
          setError(signInError.message)
          return false
        }

        setSession(data.session ?? null)
        setUser(data.user ?? data.session?.user ?? null)
        return Boolean(data.session)
      } catch (unknownError) {
        setError(formatAuthError(unknownError))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [client]
  )

  const signUpWithPassword = useCallback(
    async ({
      displayName,
      email,
      password,
    }: RegisterPayload): Promise<boolean> => {
      if (!client) {
        setError("Auth client is not ready yet")
        return false
      }

      setIsSubmitting(true)
      setError(null)

      try {
        const { data, error: signUpError } = await client.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          return false
        }

        // Keep verification-required flow consistent even if local auth is auto-confirming.
        if (data.session) {
          await client.signOut()
        }

        setSession(null)
        setUser(null)
        setVerificationEmail(email.trim())
        setMode("login")
        return true
      } catch (unknownError) {
        setError(formatAuthError(unknownError))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [client]
  )

  const signOut = useCallback(async () => {
    if (!client) {
      return
    }
    setError(null)
    await client.signOut()
    setSession(null)
    setUser(null)
    setMode("login")
  }, [client])

  const clearVerificationNotice = useCallback(() => {
    setVerificationEmail(null)
  }, [])

  const auth = useMemo(
    () => ({
      mode,
      setMode,
      error,
      clearError: () => setError(null),
      verificationEmail,
      clearVerificationNotice,
      isLoadingSession,
      isSubmitting,
      isAuthenticated: Boolean(session?.access_token),
      accessToken: session?.access_token ?? null,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userDisplayName: parseDisplayName(user),
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [
      clearVerificationNotice,
      error,
      isLoadingSession,
      isSubmitting,
      mode,
      session?.access_token,
      signInWithPassword,
      signOut,
      signUpWithPassword,
      user,
      verificationEmail,
    ]
  )

  return auth
}

