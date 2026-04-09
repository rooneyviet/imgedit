import { readBillingCreditConfig } from "../billing-config"

export type PricingCatalogPlanCode = "FREE" | "MONTHLY" | "ANNUAL"

export type PricingCatalogInterval = "MONTHLY" | "YEARLY"

export type PricingCatalogPlan = {
  code: PricingCatalogPlanCode
  label: string
  interval: PricingCatalogInterval
  priceCents: number
  monthlyCredits: number
}

export type PricingCatalog = {
  plans: PricingCatalogPlan[]
  operationCosts: {
    normalImage: number
    upscale4k: number
    styleApplied: number
  }
}

export function getPricingCatalogUseCase(): PricingCatalog {
  const config = readBillingCreditConfig()

  return {
    plans: [
      {
        code: "FREE",
        label: "Free",
        interval: "MONTHLY",
        priceCents: 0,
        monthlyCredits: config.planFreeMonthlyCredits,
      },
      {
        code: "MONTHLY",
        label: "Monthly",
        interval: "MONTHLY",
        priceCents: config.planMonthlyPriceCents,
        monthlyCredits: config.planMonthlyMonthlyCredits,
      },
      {
        code: "ANNUAL",
        label: "Annually",
        interval: "YEARLY",
        priceCents: config.planAnnualPriceCents,
        monthlyCredits: config.planAnnualMonthlyCredits,
      },
    ],
    operationCosts: {
      normalImage: config.creditCostNormalImage,
      upscale4k: config.creditCostUpscale4k,
      styleApplied: config.creditCostStyleApplied,
    },
  }
}
