import { describe, expect, it, vi } from "vitest"

import {
  executeDownloadFlow,
  executeGenerateFlow,
  executeUpscaleFlow,
} from "@/features/image-editor/use-image-editor"
import { withInputSlot } from "@/features/image-editor/helpers"

describe("image editor controller flows", () => {
  it("onGenerate success populates slots and selects first result", async () => {
    const generateImages = vi.fn(() =>
      Promise.resolve({
        images: ["https://img.test/one.jpg"],
        chargedCredits: 3,
        remainingCredits: 7,
      })
    )

    const result = await executeGenerateFlow({
      prompt: "test prompt",
      generateCount: 1,
      isDev: true,
      isMockEnabled: false,
      aspectRatio: "1:1",
      selectedImages: ["data:image/png;base64,seed"],
      generateImages,
    })

    expect(generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "test prompt",
        count: 1,
        mock: false,
        goFast: true,
        megapixels: "1",
        aspectRatio: "1:1",
        outputFormat: "jpg",
        outputQuality: 95,
        inputImagesDataUrlsOrUrls: ["data:image/png;base64,seed"],
      })
    )
    expect(result.selectedId).toBe("generated-1")
    expect(result.generatedSlots[0]).toEqual({
      generatedSrc: "https://img.test/one.jpg",
      upscaledSrc: null,
    })
    expect(result.remainingCredits).toBe(7)
  })

  it("onGenerate failure surfaces generation error", async () => {
    const generateImages = vi.fn(() =>
      Promise.reject(new Error("generation failed"))
    )

    await expect(
      executeGenerateFlow({
        prompt: "test prompt",
        generateCount: 1,
        isDev: true,
        isMockEnabled: false,
        aspectRatio: "1:1",
        selectedImages: ["data:image/png;base64,seed"],
        generateImages,
      })
    ).rejects.toThrow("generation failed")
  })

  it("onUpscale updates only the selected generated slot", async () => {
    const upscaleImage = vi.fn(() =>
      Promise.resolve({
        image: "https://img.test/two-upscaled.jpg",
        chargedCredits: 2,
        remainingCredits: 5,
      })
    )

    const result = await executeUpscaleFlow({
      selectedImage: {
        id: "generated-2",
        label: "Result 2",
        status: "ready",
        src: "https://img.test/two.jpg",
      },
      generatedSlots: [
        {
          generatedSrc: "https://img.test/one.jpg",
          upscaledSrc: null,
        },
        {
          generatedSrc: "https://img.test/two.jpg",
          upscaledSrc: null,
        },
      ],
      upscaleImage,
    })

    expect(upscaleImage).toHaveBeenCalledWith({ image: "https://img.test/two.jpg" })
    expect(result.selectedId).toBe("generated-2")
    expect(result.generatedSlots[0]).toEqual({
      generatedSrc: "https://img.test/one.jpg",
      upscaledSrc: null,
    })
    expect(result.generatedSlots[1]).toEqual({
      generatedSrc: "https://img.test/two.jpg",
      upscaledSrc: "https://img.test/two-upscaled.jpg",
    })
    expect(result.remainingCredits).toBe(5)
  })

  it("use generated as input writes expected slot", () => {
    const slots = Array.from({ length: 3 }, () => null as null | {
      previewUrl: string
      inputSource: string
    })

    const next = withInputSlot(slots, 1, "https://img.test/one.jpg")

    expect(next[1]).toEqual({
      previewUrl: "https://img.test/one.jpg",
      inputSource: "https://img.test/one.jpg",
    })
    expect(next[0]).toBeNull()
    expect(next[2]).toBeNull()
  })

  it("onDownloadImage failure surfaces download error", async () => {
    const downloadImage = vi.fn(() =>
      Promise.reject(new Error("download failed"))
    )

    await expect(
      executeDownloadFlow({
        imageUrl: "https://img.test/one.jpg",
        filename: "generated-1.jpg",
        downloadImage,
        base64ToBlob: () => new Blob(["blob"], { type: "image/jpeg" }),
      })
    ).rejects.toThrow("download failed")
  })
})
