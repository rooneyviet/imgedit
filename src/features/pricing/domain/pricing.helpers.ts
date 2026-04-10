type PlanCode = "FREE" | "MONTHLY" | "ANNUAL" | null

type PlanButtonState = {
  label: string
  disabled: boolean
}

const PLAN_TIER: Record<string, number> = {
  FREE: 0,
  MONTHLY: 1,
  ANNUAL: 2,
}

export function getFreePlanButtonState(activePlanCode: PlanCode): PlanButtonState {
  if (activePlanCode === "FREE") {
    return { label: "CURRENT PLAN", disabled: false }
  }

  const activeTier = activePlanCode ? (PLAN_TIER[activePlanCode] ?? 0) : -1
  return {
    label: "START CREATING",
    disabled: activeTier > PLAN_TIER.FREE,
  }
}

export function getPaidPlanButtonState(
  activePlanCode: PlanCode,
  targetPlanCode: "MONTHLY" | "ANNUAL",
  pendingPlanCode: "MONTHLY" | "ANNUAL" | null
): PlanButtonState {
  if (activePlanCode === targetPlanCode) {
    return { label: "CURRENT PLAN", disabled: true }
  }

  const activeTier = activePlanCode ? (PLAN_TIER[activePlanCode] ?? 0) : -1
  const targetTier = PLAN_TIER[targetPlanCode]

  if (activeTier >= targetTier) {
    return {
      label: targetPlanCode === "MONTHLY" ? "CHOOSE MONTHLY PLAN" : "CHOOSE ANNUAL PLAN",
      disabled: true,
    }
  }

  if (pendingPlanCode === targetPlanCode) {
    return { label: "OPENING CHECKOUT...", disabled: true }
  }

  if (pendingPlanCode !== null) {
    return {
      label: targetPlanCode === "MONTHLY" ? "CHOOSE MONTHLY PLAN" : "CHOOSE ANNUAL PLAN",
      disabled: true,
    }
  }

  return {
    label: targetPlanCode === "MONTHLY" ? "CHOOSE MONTHLY PLAN" : "CHOOSE ANNUAL PLAN",
    disabled: false,
  }
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}
