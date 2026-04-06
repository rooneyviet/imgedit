import { EditorSidebar } from "./components/editor-sidebar"
import { PreviewPanel } from "./components/preview-panel"
import type { ImageEditorController } from "./use-image-editor"

type ImageEditorPageProps = {
  controller: ImageEditorController
}

export function ImageEditorPage({ controller }: ImageEditorPageProps) {
  return (
    <main className="min-h-svh bg-[linear-gradient(140deg,#f8fafc_0%,#fff7ed_45%,#f1f5f9_100%)] p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-450 grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[340px_1fr]">
        <EditorSidebar controller={controller} />
        <PreviewPanel controller={controller} />
      </div>
    </main>
  )
}
