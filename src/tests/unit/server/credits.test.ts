import { describe, expect, it } from "vitest"

import { calculateCreditsFromUnitCosts } from "@/lib/server/credits"

describe("credits", () => {
  it("calculates credits for normal image quantities", () => {
    const total = calculateCreditsFromUnitCosts(
      [{ code: "NORMAL_IMAGE", quantity: 2 }],
      {
        NORMAL_IMAGE: 3,
        UPSCALE_4K: 2,
        STYLE_APPLIED: 1,
      }
    )

    expect(total).toBe(6)
  })

  it("calculates mixed mode costs", () => {
    const total = calculateCreditsFromUnitCosts(
      [
        { code: "NORMAL_IMAGE", quantity: 1 },
        { code: "STYLE_APPLIED", quantity: 1 },
        { code: "UPSCALE_4K", quantity: 1 },
      ],
      {
        NORMAL_IMAGE: 3,
        UPSCALE_4K: 2,
        STYLE_APPLIED: 1,
      }
    )

    expect(total).toBe(6)
  })
})
