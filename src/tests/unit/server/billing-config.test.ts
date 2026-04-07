import { describe, expect, it } from "vitest"

import { readBillingCreditConfig } from "@/lib/server/billing-config"

describe("billing-config", () => {
  it("uses defaults when env vars are missing", () => {
    const config = readBillingCreditConfig({})

    expect(config).toEqual({
      creditCostNormalImage: 3,
      creditCostUpscale4k: 2,
      creditCostStyleApplied: 1,
      planFreeMonthlyCredits: 10,
      planMonthlyMonthlyCredits: 50,
      planAnnualMonthlyCredits: 1000,
    })
  })

  it("parses custom integer env vars", () => {
    const config = readBillingCreditConfig({
      CREDIT_COST_NORMAL_IMAGE: "4",
      CREDIT_COST_UPSCALE_4K: "3",
      CREDIT_COST_STYLE_APPLIED: "2",
      PLAN_FREE_MONTHLY_CREDITS: "15",
      PLAN_MONTHLY_MONTHLY_CREDITS: "60",
      PLAN_ANNUAL_MONTHLY_CREDITS: "1100",
    })

    expect(config).toEqual({
      creditCostNormalImage: 4,
      creditCostUpscale4k: 3,
      creditCostStyleApplied: 2,
      planFreeMonthlyCredits: 15,
      planMonthlyMonthlyCredits: 60,
      planAnnualMonthlyCredits: 1100,
    })
  })

  it("throws when env var is invalid", () => {
    expect(() =>
      readBillingCreditConfig({
        CREDIT_COST_NORMAL_IMAGE: "-1",
      })
    ).toThrow("CREDIT_COST_NORMAL_IMAGE must be a non-negative integer")
  })
})
