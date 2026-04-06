import { CircleHelp, Database, Settings } from "lucide-react"

import { EditorSidebar } from "./components/editor-sidebar"
import { PreviewPanel } from "./components/preview-panel"
import type { ImageEditorController } from "./use-image-editor"

import { Button } from "@/components/ui/button"

type ImageEditorPageProps = {
  controller: ImageEditorController
}

export function ImageEditorPage({ controller }: ImageEditorPageProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border/80 bg-card px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="font-mono text-xl font-black tracking-tight text-primary sm:text-2xl">
            IMG EDIT
          </span>
          <nav className="hidden items-center gap-4 text-xs sm:flex">
            <span className="border-b-2 border-primary pb-0.5 font-mono font-bold tracking-wider text-primary">
              GALLERY
            </span>
            <span className="font-mono tracking-wider text-muted-foreground">
              RESOURCES
            </span>
            <span className="font-mono tracking-wider text-muted-foreground">
              DOCUMENTATION
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" aria-label="Settings">
            <Settings size={16} />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Help">
            <CircleHelp size={16} />
          </Button>
          <div className="grid h-8 w-8 place-items-center border border-border bg-muted text-[10px] font-semibold tracking-wide">
            A7
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="w-full border-b border-border/80 bg-muted/40 lg:h-full lg:w-80 lg:border-r lg:border-b-0">
          <EditorSidebar controller={controller} />
        </aside>
        <section className="min-h-0 flex-1 bg-background">
          <PreviewPanel controller={controller} />
        </section>
      </main>

      <footer className="flex h-8 items-center justify-between border-t border-border/70 bg-zinc-950 px-4 text-[9px] tracking-[0.2em] text-zinc-400 uppercase sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500" />
            ENGINE_READY
          </span>
          <span className="hidden sm:inline">LATENCY: 142MS</span>
          <span className="hidden md:inline">CPU: 12%</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-300">
          <span>USER: ADMIN_77</span>
          <Database size={10} />
        </div>
      </footer>
    </div>
  )
}
