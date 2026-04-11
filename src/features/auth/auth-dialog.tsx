import { type FormEvent, useMemo, useState } from "react"
import { ArrowRight, Pencil, XIcon } from "lucide-react"

import type { AuthMode, RegisterPayload } from "./use-auth"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type AuthDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: AuthMode
  isLoadingSession: boolean
  isSubmitting: boolean
  error: string | null
  verificationEmail: string | null
  onModeChange: (mode: AuthMode) => void
  onLogin: (payload: { email: string; password: string }) => Promise<boolean>
  onRegister: (payload: RegisterPayload) => Promise<boolean>
  onDismissVerificationNotice: () => void
}

const PASS_MIN_LENGTH = 8

export function AuthDialog({
  open,
  onOpenChange,
  mode,
  isLoadingSession,
  isSubmitting,
  error,
  verificationEmail,
  onModeChange,
  onLogin,
  onRegister,
  onDismissVerificationNotice,
}: AuthDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [providerMessage, setProviderMessage] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const heading = mode === "login" ? "Login" : "Register"
  const submitLabel = mode === "login" ? "Sign in" : "Create account"

  const activeError = localError || error
  const isBusy = isLoadingSession || isSubmitting

  const verificationHint = useMemo(() => {
    if (!verificationEmail) {
      return null
    }
    return `Verification pending for ${verificationEmail}`
  }, [verificationEmail])

  const resetProviderMessage = () => setProviderMessage(null)

  const resetForm = () => {
    setPassword("")
    setConfirmPassword("")
    setLocalError(null)
    setProviderMessage(null)
  }

  const switchMode = (nextMode: AuthMode) => {
    onModeChange(nextMode)
    setLocalError(null)
    resetProviderMessage()
    if (nextMode === "register") {
      onDismissVerificationNotice()
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    resetProviderMessage()

    if (mode === "register") {
      if (displayName.trim().length < 2) {
        setLocalError("Display name must be at least 2 characters")
        return
      }
      if (password.length < PASS_MIN_LENGTH) {
        setLocalError(`Password must be at least ${PASS_MIN_LENGTH} characters`)
        return
      }
      if (password !== confirmPassword) {
        setLocalError("Password and confirm password do not match")
        return
      }

      const success = await onRegister({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      })
      if (success) {
        resetForm()
      }
      return
    }

    const success = await onLogin({
      email: email.trim(),
      password,
    })
    if (success) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-140 border border-border bg-card p-0 shadow-lg ring-0 sm:max-w-140"
      >
        <DialogTitle className="sr-only">Authentication</DialogTitle>
        <div className="relative overflow-hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 z-30"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>

          <div className="relative z-10 p-10 md:p-12">
            <div className="mb-10">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
                  <Pencil className="size-4" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-foreground">
                  IMG Edit
                </span>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-[0.3em] text-muted-foreground">
                {heading}
              </h2>
            </div>

            <form className="space-y-6" onSubmit={onSubmit}>
              {mode === "register" ? (
                <div className="space-y-2">
                  <label
                    className="block text-[10px] font-bold tracking-widest text-muted-foreground"
                    htmlFor="display-name"
                  >
                    Display name
                  </label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Operator Name"
                    disabled={isBusy}
                    className="h-12 border-none bg-muted px-4 font-mono text-sm placeholder:text-muted-foreground/70"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  className="block text-[10px] font-bold tracking-widest text-muted-foreground"
                  htmlFor="auth-email"
                >
                  Email address
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@workspace.io"
                  disabled={isBusy}
                  required
                  className="h-12 border-none bg-muted px-4 font-mono text-sm placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <label
                    className="block text-[10px] font-bold tracking-widest text-muted-foreground"
                    htmlFor="auth-password"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalError("Password reset flow is not wired yet")
                    }
                    className="text-[9px] font-bold tracking-wider text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  disabled={isBusy}
                  required
                  className="h-12 border-none bg-muted px-4 font-mono text-sm placeholder:text-muted-foreground/70"
                />
              </div>

              {mode === "register" ? (
                <div className="space-y-2">
                  <label
                    className="block text-[10px] font-bold tracking-widest text-muted-foreground"
                    htmlFor="auth-confirm-password"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••••••"
                    disabled={isBusy}
                    required
                    className="h-12 border-none bg-muted px-4 font-mono text-sm placeholder:text-muted-foreground/70"
                  />
                </div>
              ) : null}

              <div className="space-y-4 pt-1">
                <Button
                  type="submit"
                  disabled={isBusy}
                  className="h-14 w-full bg-linear-to-br from-primary to-accent text-xs font-bold tracking-[0.2em] text-primary-foreground hover:opacity-90"
                >
                  {isBusy ? "Processing..." : submitLabel}
                  <ArrowRight className="size-4" />
                </Button>

                <div className="relative flex items-center py-1">
                  <div className="grow border-t border-border" />
                  <span className="mx-3 text-[9px] font-bold tracking-widest text-muted-foreground">
                    Or use a provider
                  </span>
                  <div className="grow border-t border-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() =>
                    setProviderMessage("Google auth is coming soon in this app")
                  }
                  className="h-14 w-full border-border bg-card text-xs font-bold tracking-[0.2em] text-foreground hover:bg-muted"
                >
                  Continue with Google
                </Button>
              </div>
            </form>

            {verificationHint ? (
              <div className="mt-5 bg-emerald-100 px-3 py-2 text-[10px] font-semibold tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {verificationHint}. Check your inbox, then sign in.
              </div>
            ) : null}

            {providerMessage ? (
              <p className="mt-4 text-[10px] font-semibold tracking-wide text-muted-foreground">
                {providerMessage}
              </p>
            ) : null}

            {activeError ? (
              <p className="mt-4 text-[10px] font-semibold tracking-wide text-destructive">
                {activeError}
              </p>
            ) : null}

            <div className="pt-6 text-center">
              <button
                type="button"
                className="text-[10px] font-bold text-primary hover:underline"
                onClick={() =>
                  switchMode(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? "Create account" : "Back to login"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
