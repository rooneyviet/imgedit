export function AppFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="flex w-full max-w-full flex-col items-center justify-between border-t border-border/80 bg-muted/40 px-5 py-4 md:flex-row">
      <div className="mb-8 md:mb-0">
        <span className="font-mono text-xl font-bold tracking-tighter text-foreground">
          IMG EDIT
        </span>
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          ©{currentYear}. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  )
}
