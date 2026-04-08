import type {
  PricingCatalog,
  PricingCatalogPlan,
  PricingCatalogPlanCode,
} from "@/lib/server/application/get-pricing-catalog.service"

export type PricingPageModel = {
  freePlan: PricingCatalogPlan
  monthlyPlan: PricingCatalogPlan
  annualPlan: PricingCatalogPlan
  operationCosts: PricingCatalog["operationCosts"]
  annualEquivalentMonthlyPriceCents: number
}

function requirePlan(
  plans: PricingCatalogPlan[],
  code: PricingCatalogPlanCode
): PricingCatalogPlan {
  const plan = plans.find((item) => item.code === code)
  if (!plan) {
    throw new Error(`Missing pricing plan: ${code}`)
  }

  return plan
}

export function selectPricingPageModel(catalog: PricingCatalog): PricingPageModel {
  const freePlan = requirePlan(catalog.plans, "FREE")
  const monthlyPlan = requirePlan(catalog.plans, "MONTHLY")
  const annualPlan = requirePlan(catalog.plans, "ANNUAL")

  return {
    freePlan,
    monthlyPlan,
    annualPlan,
    operationCosts: catalog.operationCosts,
    annualEquivalentMonthlyPriceCents: Math.round(annualPlan.priceCents / 12),
  }
}
