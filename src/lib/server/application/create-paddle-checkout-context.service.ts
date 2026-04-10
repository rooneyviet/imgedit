import type { BillingPlanCode } from "../../../../generated/prisma/enums"

import { requireAuthenticatedUser } from "../auth"
import { createPaddleCustomDataSignature } from "../paddle-config"
import { prisma } from "../prisma"

export type CreatePaddleCheckoutContextRequest = {
  accessToken: string
  planCode: "MONTHLY" | "ANNUAL"
}

export type CreatePaddleCheckoutContextResponse = {
  profileId: string
  email: string | null
  signedAt: number
  signature: string
}

const PLAN_TIER_ORDER: Record<BillingPlanCode, number> = {
  FREE: 0,
  MONTHLY: 1,
  ANNUAL: 2,
}

export async function createPaddleCheckoutContextUseCase(
  rawInput: unknown
): Promise<CreatePaddleCheckoutContextResponse> {
  if (!rawInput || typeof rawInput !== "object") {
    throw new Error("Invalid request payload")
  }

  const input = rawInput as Partial<CreatePaddleCheckoutContextRequest>
  const accessToken = (input.accessToken ?? "").trim()
  if (!accessToken) {
    throw new Error("Access token is required")
  }

  const planCode = input.planCode
  if (planCode !== "MONTHLY" && planCode !== "ANNUAL") {
    throw new Error("Invalid plan code")
  }

  const user = await requireAuthenticatedUser(accessToken)

  const activeSubscription = await prisma.billingSubscription.findFirst({
    where: {
      profileId: user.id,
      status: "ACTIVE",
    },
    select: {
      plan: {
        select: {
          code: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  if (activeSubscription) {
    const currentTier = PLAN_TIER_ORDER[activeSubscription.plan.code]
    const requestedTier = PLAN_TIER_ORDER[planCode]

    if (requestedTier <= currentTier) {
      throw new Error(
        activeSubscription.plan.code === planCode
          ? "You already have an active subscription for this plan."
          : "You already have a higher-tier subscription active."
      )
    }
  }

  const signedAt = Math.floor(Date.now() / 1000)

  return {
    profileId: user.id,
    email: user.email,
    signedAt,
    signature: createPaddleCustomDataSignature({
      profileId: user.id,
      signedAt,
    }),
  }
}
