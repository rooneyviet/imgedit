import { Button } from "@/components/ui/button"

type TopHeaderAuthControlsProps = {
  isAuthenticated: boolean
  isLoadingSession: boolean
  userLabel: string
  remainingCredits: number | null
  onLogout: () => void
  onOpenLogin: () => void
}

export function TopHeaderAuthControls({
  isAuthenticated,
  isLoadingSession,
  userLabel,
  remainingCredits,
  onLogout,
  onOpenLogin,
}: TopHeaderAuthControlsProps) {
  if (isAuthenticated) {
    return (
      <>
        <div className="hidden items-center gap-2 md:flex">
          <div className="border border-border bg-muted px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
            {userLabel}
          </div>
          <div className="border border-primary/60 bg-primary/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-primary uppercase">
            {remainingCredits ?? 0} CREDITS
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="pointer-events-auto h-8 px-2 font-mono text-[10px] tracking-wider uppercase"
          onClick={onLogout}
        >
          LOGOUT
        </Button>
      </>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      className="h-8 px-2 font-mono text-[10px] tracking-wider uppercase"
      onClick={onOpenLogin}
    >
      {isLoadingSession ? "AUTH_CHECK" : "SIGN_IN"}
    </Button>
  )
}
