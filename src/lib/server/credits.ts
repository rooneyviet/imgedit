import { Prisma } from "../../../generated/prisma/client"

import { readBillingCreditConfig } from "./billing-config"
import { prisma } from "./prisma"

export const CREDIT_OPERATION_CODES = {
  NORMAL_IMAGE: "NORMAL_IMAGE",
  UPSCALE_4K: "UPSCALE_4K",
  STYLE_APPLIED: "STYLE_APPLIED",
} as const

type CreditOperationCode =
  (typeof CREDIT_OPERATION_CODES)[keyof typeof CREDIT_OPERATION_CODES]

type CreditCostItem = {
  code: CreditOperationCode
  quantity: number
}

type ChargeCreditsInput = {
  profileId: string
  requiredCredits: number
  reason: string
  operationCode: CreditOperationCode
  metadata?: Prisma.InputJsonValue
}

export class InsufficientCreditsError extends Error {
  requiredCredits: number
  availableCredits: number

  constructor(requiredCredits: number, availableCredits: number) {
    super(
      `Insufficient credits. Required ${requiredCredits}, available ${availableCredits}.`
    )
    this.name = "InsufficientCreditsError"
    this.requiredCredits = requiredCredits
    this.availableCredits = availableCredits
  }
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0
  }

  return Math.max(0, Math.floor(quantity))
}

export function calculateCreditsFromUnitCosts(
  items: Array<CreditCostItem>,
  unitCosts: Record<CreditOperationCode, number>
): number {
  return items.reduce((total, item) => {
    const quantity = normalizeQuantity(item.quantity)
    const unitCost = unitCosts[item.code]
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error(`Invalid unit cost for ${item.code}`)
    }
    return total + unitCost * quantity
  }, 0)
}

function getUnitCostsFromConfig(): Record<CreditOperationCode, number> {
  const config = readBillingCreditConfig()
  return {
    NORMAL_IMAGE: config.creditCostNormalImage,
    UPSCALE_4K: config.creditCostUpscale4k,
    STYLE_APPLIED: config.creditCostStyleApplied,
  }
}

export function calculateRequiredCredits(items: Array<CreditCostItem>): number {
  const unitCosts = getUnitCostsFromConfig()
  return calculateCreditsFromUnitCosts(items, unitCosts)
}

export async function ensureUserBillingState(profileId: string): Promise<{
  creditAccountId: string
  remainingCredits: number
}> {
  const config = readBillingCreditConfig()

  return prisma.$transaction(async (tx) => {
    const freePlan = await tx.billingPlan.findUnique({
      where: {
        code: "FREE",
      },
      select: {
        id: true,
      },
    })

    if (!freePlan) {
      throw new Error("Missing FREE billing plan")
    }

    const creditAccount = await tx.creditAccount.upsert({
      where: { profileId },
      create: {
        profileId,
        balance: config.planFreeMonthlyCredits,
      },
      update: {},
      select: {
        id: true,
        balance: true,
      },
    })

    const activeSubscription = await tx.billingSubscription.findFirst({
      where: {
        profileId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    })

    if (!activeSubscription) {
      await tx.billingSubscription.create({
        data: {
          profileId,
          planId: freePlan.id,
          status: "ACTIVE",
        },
      })
    }

    return {
      creditAccountId: creditAccount.id,
      remainingCredits: creditAccount.balance,
    }
  })
}

export async function assertSufficientCredits(
  profileId: string,
  requiredCredits: number
): Promise<number> {
  if (requiredCredits <= 0) {
    const state = await ensureUserBillingState(profileId)
    return state.remainingCredits
  }

  const state = await ensureUserBillingState(profileId)
  if (state.remainingCredits < requiredCredits) {
    throw new InsufficientCreditsError(requiredCredits, state.remainingCredits)
  }

  return state.remainingCredits
}

export async function chargeCreditsOnSuccess({
  profileId,
  requiredCredits,
  reason,
  operationCode,
  metadata,
}: ChargeCreditsInput): Promise<{ remainingCredits: number }> {
  if (requiredCredits <= 0) {
    const state = await ensureUserBillingState(profileId)
    return { remainingCredits: state.remainingCredits }
  }

  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.creditAccount.updateMany({
      where: {
        profileId,
        balance: {
          gte: requiredCredits,
        },
      },
      data: {
        balance: {
          decrement: requiredCredits,
        },
      },
    })

    if (updateResult.count === 0) {
      const current = await tx.creditAccount.findUnique({
        where: {
          profileId,
        },
        select: {
          balance: true,
        },
      })
      throw new InsufficientCreditsError(requiredCredits, current?.balance ?? 0)
    }

    const account = await tx.creditAccount.findUnique({
      where: {
        profileId,
      },
      select: {
        id: true,
        balance: true,
      },
    })

    if (!account) {
      throw new Error("Credit account was not found after charge")
    }

    await tx.creditTransaction.create({
      data: {
        creditAccountId: account.id,
        direction: "DEBIT",
        amount: requiredCredits,
        balanceAfter: account.balance,
        reason,
        operationCode,
        metadata,
      },
    })

    return { remainingCredits: account.balance }
  })
}
