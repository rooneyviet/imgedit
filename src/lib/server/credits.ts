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

type SyncOptions = {
  force?: boolean
}

type ChargeCreditsInput = {
  profileId: string
  requiredCredits: number
  reason: string
  operationCode: CreditOperationCode
  metadata?: Prisma.InputJsonValue
}

const PLAN_CODES = {
  FREE: "FREE",
  MONTHLY: "MONTHLY",
  ANNUAL: "ANNUAL",
} as const

const PLAN_INTERVALS = {
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const

const SYNC_TTL_MS = 30_000

let lastSyncedSignature: string | null = null
let lastSyncedAt = 0

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

function createConfigSignature(): string {
  const config = readBillingCreditConfig()
  return JSON.stringify(config)
}

export async function syncCreditsAndBillingCatalog(
  options: SyncOptions = {}
): Promise<void> {
  const now = Date.now()
  const signature = createConfigSignature()

  if (
    !options.force &&
    lastSyncedSignature === signature &&
    now - lastSyncedAt < SYNC_TTL_MS
  ) {
    return
  }

  const config = readBillingCreditConfig()

  await prisma.$transaction(async (tx) => {
    await tx.creditPricingRule.upsert({
      where: { code: CREDIT_OPERATION_CODES.NORMAL_IMAGE },
      create: {
        code: CREDIT_OPERATION_CODES.NORMAL_IMAGE,
        creditsPerUnit: config.creditCostNormalImage,
        isActive: true,
      },
      update: {
        creditsPerUnit: config.creditCostNormalImage,
        isActive: true,
      },
    })

    await tx.creditPricingRule.upsert({
      where: { code: CREDIT_OPERATION_CODES.UPSCALE_4K },
      create: {
        code: CREDIT_OPERATION_CODES.UPSCALE_4K,
        creditsPerUnit: config.creditCostUpscale4k,
        isActive: true,
      },
      update: {
        creditsPerUnit: config.creditCostUpscale4k,
        isActive: true,
      },
    })

    await tx.creditPricingRule.upsert({
      where: { code: CREDIT_OPERATION_CODES.STYLE_APPLIED },
      create: {
        code: CREDIT_OPERATION_CODES.STYLE_APPLIED,
        creditsPerUnit: config.creditCostStyleApplied,
        isActive: true,
      },
      update: {
        creditsPerUnit: config.creditCostStyleApplied,
        isActive: true,
      },
    })

    await tx.billingPlan.upsert({
      where: { code: PLAN_CODES.FREE },
      create: {
        code: PLAN_CODES.FREE,
        name: "Free",
        priceCents: 0,
        currency: "USD",
        interval: PLAN_INTERVALS.MONTHLY,
        monthlyCredits: config.planFreeMonthlyCredits,
        isActive: true,
      },
      update: {
        name: "Free",
        priceCents: 0,
        currency: "USD",
        interval: PLAN_INTERVALS.MONTHLY,
        monthlyCredits: config.planFreeMonthlyCredits,
        isActive: true,
      },
    })

    await tx.billingPlan.upsert({
      where: { code: PLAN_CODES.MONTHLY },
      create: {
        code: PLAN_CODES.MONTHLY,
        name: "Monthly",
        priceCents: 449,
        currency: "USD",
        interval: PLAN_INTERVALS.MONTHLY,
        monthlyCredits: config.planMonthlyMonthlyCredits,
        isActive: true,
      },
      update: {
        name: "Monthly",
        priceCents: 449,
        currency: "USD",
        interval: PLAN_INTERVALS.MONTHLY,
        monthlyCredits: config.planMonthlyMonthlyCredits,
        isActive: true,
      },
    })

    await tx.billingPlan.upsert({
      where: { code: PLAN_CODES.ANNUAL },
      create: {
        code: PLAN_CODES.ANNUAL,
        name: "Annual",
        priceCents: 1999,
        currency: "USD",
        interval: PLAN_INTERVALS.YEARLY,
        monthlyCredits: config.planAnnualMonthlyCredits,
        isActive: true,
      },
      update: {
        name: "Annual",
        priceCents: 1999,
        currency: "USD",
        interval: PLAN_INTERVALS.YEARLY,
        monthlyCredits: config.planAnnualMonthlyCredits,
        isActive: true,
      },
    })
  })

  lastSyncedSignature = signature
  lastSyncedAt = now
}

export async function ensureUserBillingState(profileId: string): Promise<{
  creditAccountId: string
  remainingCredits: number
}> {
  await syncCreditsAndBillingCatalog()

  return prisma.$transaction(async (tx) => {
    const freePlan = await tx.billingPlan.findUnique({
      where: {
        code: PLAN_CODES.FREE,
      },
      select: {
        id: true,
        monthlyCredits: true,
      },
    })

    if (!freePlan) {
      throw new Error("Missing FREE billing plan")
    }

    const creditAccount = await tx.creditAccount.upsert({
      where: { profileId },
      create: {
        profileId,
        balance: freePlan.monthlyCredits,
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

async function getUnitCostsForCodes(
  codes: Array<CreditOperationCode>
): Promise<Record<CreditOperationCode, number>> {
  const uniqueCodes = Array.from(new Set(codes))
  if (uniqueCodes.length === 0) {
    return {
      NORMAL_IMAGE: 0,
      UPSCALE_4K: 0,
      STYLE_APPLIED: 0,
    }
  }

  const rules = await prisma.creditPricingRule.findMany({
    where: {
      code: {
        in: uniqueCodes,
      },
      isActive: true,
    },
    select: {
      code: true,
      creditsPerUnit: true,
    },
  })

  const costMap = new Map<CreditOperationCode, number>()
  for (const rule of rules) {
    costMap.set(rule.code as CreditOperationCode, rule.creditsPerUnit)
  }

  for (const code of uniqueCodes) {
    if (!costMap.has(code)) {
      throw new Error(`Missing active pricing rule for ${code}`)
    }
  }

  return {
    NORMAL_IMAGE: costMap.get(CREDIT_OPERATION_CODES.NORMAL_IMAGE) ?? 0,
    UPSCALE_4K: costMap.get(CREDIT_OPERATION_CODES.UPSCALE_4K) ?? 0,
    STYLE_APPLIED: costMap.get(CREDIT_OPERATION_CODES.STYLE_APPLIED) ?? 0,
  }
}

export async function getNormalImageUnitCost(): Promise<number> {
  const unitCosts = await getUnitCostsForCodes([
    CREDIT_OPERATION_CODES.NORMAL_IMAGE,
  ])
  return unitCosts[CREDIT_OPERATION_CODES.NORMAL_IMAGE]
}

export async function calculateRequiredCredits(
  items: Array<CreditCostItem>
): Promise<number> {
  const unitCosts = await getUnitCostsForCodes(items.map((item) => item.code))
  return calculateCreditsFromUnitCosts(items, unitCosts)
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
