const DEFAULT_CREDIT_COST_NORMAL_IMAGE = 3
const DEFAULT_CREDIT_COST_UPSCALE_4K = 2
const DEFAULT_CREDIT_COST_STYLE_APPLIED = 1

const DEFAULT_PLAN_FREE_MONTHLY_CREDITS = 10
const DEFAULT_PLAN_MONTHLY_MONTHLY_CREDITS = 50
const DEFAULT_PLAN_ANNUAL_MONTHLY_CREDITS = 1000

export type BillingCreditConfig = {
  creditCostNormalImage: number
  creditCostUpscale4k: number
  creditCostStyleApplied: number
  planFreeMonthlyCredits: number
  planMonthlyMonthlyCredits: number
  planAnnualMonthlyCredits: number
}

function parseNonNegativeInteger(
  name: string,
  rawValue: string | undefined,
  fallback: number
): number {
  if (rawValue == null || rawValue.trim().length === 0) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }

  return parsed
}

export function readBillingCreditConfig(
  env: Record<string, string | undefined> = process.env
): BillingCreditConfig {
  return {
    creditCostNormalImage: parseNonNegativeInteger(
      "CREDIT_COST_NORMAL_IMAGE",
      env.CREDIT_COST_NORMAL_IMAGE,
      DEFAULT_CREDIT_COST_NORMAL_IMAGE
    ),
    creditCostUpscale4k: parseNonNegativeInteger(
      "CREDIT_COST_UPSCALE_4K",
      env.CREDIT_COST_UPSCALE_4K,
      DEFAULT_CREDIT_COST_UPSCALE_4K
    ),
    creditCostStyleApplied: parseNonNegativeInteger(
      "CREDIT_COST_STYLE_APPLIED",
      env.CREDIT_COST_STYLE_APPLIED,
      DEFAULT_CREDIT_COST_STYLE_APPLIED
    ),
    planFreeMonthlyCredits: parseNonNegativeInteger(
      "PLAN_FREE_MONTHLY_CREDITS",
      env.PLAN_FREE_MONTHLY_CREDITS,
      DEFAULT_PLAN_FREE_MONTHLY_CREDITS
    ),
    planMonthlyMonthlyCredits: parseNonNegativeInteger(
      "PLAN_MONTHLY_MONTHLY_CREDITS",
      env.PLAN_MONTHLY_MONTHLY_CREDITS,
      DEFAULT_PLAN_MONTHLY_MONTHLY_CREDITS
    ),
    planAnnualMonthlyCredits: parseNonNegativeInteger(
      "PLAN_ANNUAL_MONTHLY_CREDITS",
      env.PLAN_ANNUAL_MONTHLY_CREDITS,
      DEFAULT_PLAN_ANNUAL_MONTHLY_CREDITS
    ),
  }
}
