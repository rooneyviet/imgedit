import { describe, expect, it } from "vitest"

import {
  calculateAspectRatioValue,
  clampGenerateCount,
  createPreviewGalleryItems,
  generatedIdFromIndex,
  generatedIdToSlotIndex,
} from "@/features/image-editor/helpers"

describe("index.helpers", () => {
  it("clamps generate count boundaries", () => {
    expect(clampGenerateCount(-2)).toBe(1)
    expect(clampGenerateCount(0)).toBe(1)
    expect(clampGenerateCount(2)).toBe(2)
    expect(clampGenerateCount(9)).toBe(4)
  })

  it("parses generated id into slot index", () => {
    expect(generatedIdFromIndex(0)).toBe("generated-1")
    expect(generatedIdToSlotIndex("generated-1")).toBe(0)
    expect(generatedIdToSlotIndex("generated-4")).toBe(3)
    expect(generatedIdToSlotIndex("generated-0")).toBeNull()
    expect(generatedIdToSlotIndex("invalid")).toBeNull()
  })

  it("calculates aspect ratio with safe fallback behavior", () => {
    expect(calculateAspectRatioValue("16:9")).toBeCloseTo(16 / 9)
    expect(calculateAspectRatioValue("0:9")).toBeCloseTo(1 / 9)
    expect(calculateAspectRatioValue("16:0")).toBeCloseTo(16)
    expect(calculateAspectRatioValue("bad:value")).toBe(1)
  })

  it("creates preview gallery items sized by aspect ratio", () => {
    const items = createPreviewGalleryItems(2, "16:9")

    expect(items).toHaveLength(2)
    expect(items[0]?.status).toBe("preview")
    expect(items[0]?.id).toBe("generated-1")

    const src = items[0]?.src ?? ""
    expect(src.startsWith("data:image/svg+xml;utf8,")).toBe(true)

    const svg = decodeURIComponent(src.replace("data:image/svg+xml;utf8,", ""))
    expect(svg).toContain("viewBox='0 0 1600 900'")
  })
})
