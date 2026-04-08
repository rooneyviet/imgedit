import { Database } from "lucide-react"

import { EditorSidebar } from "./components/editor-sidebar"
import { PreviewPanel } from "./components/preview-panel"
import type { ImageEditorController } from "./use-image-editor"

type ImageEditorPageProps = {
  controller: ImageEditorController
  auth: {
    isAuthenticated: boolean
    userDisplayName: string | null
    userEmail: string | null
  }
}

export function ImageEditorPage({ controller, auth }: ImageEditorPageProps) {
  const userLabel =
    auth.userDisplayName || auth.userEmail || (auth.isAuthenticated ? "User" : "Guest")

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-background text-foreground">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="w-full border-b border-border/80 bg-muted/40 lg:h-full lg:w-80 lg:border-r lg:border-b-0">
          <EditorSidebar controller={controller} />
        </aside>
        <section className="min-h-0 flex-1 bg-background">
          <PreviewPanel controller={controller} />
        </section>
      </main>

      <footer className="flex h-8 items-center justify-between border-t border-border/70 bg-zinc-950 px-4 text-[9px] tracking-[0.2em] text-zinc-400 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500" />
            Engine ready
          </span>
          <span className="hidden sm:inline">Latency: 142ms</span>
          <span className="hidden md:inline">CPU: 12%</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-300">
          <span>User: {userLabel}</span>
          <Database size={10} />
        </div>
      </footer>
    </div>
  )
}
