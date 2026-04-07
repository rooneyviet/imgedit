import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

type AppTopHeaderProps = {
  activeTab: "gallery" | "pricing"
  rightSlot: ReactNode
}

export function AppTopHeader({ activeTab, rightSlot }: AppTopHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/80 bg-card px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="font-mono text-xl font-black tracking-tight text-primary sm:text-2xl"
        >
          IMG EDIT
        </Link>
        <nav className="hidden items-center gap-4 text-xs sm:flex">
          {activeTab === "pricing" ? (
            <span className="border-b-2 border-primary pb-0.5 font-mono font-bold tracking-wider text-primary">
              PRICING
            </span>
          ) : (
            <Link
              to="/pricing"
              className="font-mono tracking-wider text-muted-foreground hover:text-foreground"
            >
              PRICING
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </header>
  )
}
