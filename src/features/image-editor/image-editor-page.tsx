import { EditorSidebar } from "./components/editor-sidebar"
import { PreviewPanel } from "./components/preview-panel"
import type { ImageEditorController } from "./use-image-editor"
import { AppFooter } from "@/components/app-footer"

type ImageEditorPageProps = {
  controller: ImageEditorController
}

export function ImageEditorPage({ controller }: ImageEditorPageProps) {
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
      <AppFooter />
    </div>
  )
}
