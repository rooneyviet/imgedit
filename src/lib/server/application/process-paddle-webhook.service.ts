import { Prisma } from "../../../../generated/prisma/client"
import type {
  BillingPlanCode,
  BillingSubscriptionStatus,
} from "../../../../generated/prisma/enums"

import { prisma } from "../prisma"
import {
  assertValidPaddleWebhookSignature,
  extractVerifiedProfileIdFromPaddleCustomData,
  mapPaddlePriceIdToPlanCode,
  mapPaddleSubscriptionStatus,
} from "../paddle-config"

const CREDIT_GRANT_REASON = "PADDLE_SUBSCRIPTION_CREDIT"

type PaddleWebhookEnvelope = {
  event_id: string
  event_type: string
  occurred_at: string | null
  data: Record<string, unknown>
}

export type ProcessPaddleWebhookRequest = {
  rawBody: string
  paddleSignatureHeader: string | null
}

export type ProcessPaddleWebhookResponse = {
  eventId: string
  eventType: string
  handled: boolean
  reason?: string
}

export class PaddleWebhookRequestError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = "PaddleWebhookRequestError"
    this.statusCode = statusCode
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function parseWebhookEnvelope(rawBody: string): PaddleWebhookEnvelope {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new PaddleWebhookRequestError("Webhook body must be valid JSON", 400)
  }

  const payload = asRecord(parsed)
  if (!payload) {
    throw new PaddleWebhookRequestError("Webhook payload must be an object", 400)
  }

  const eventId = payload["event_id"]
  const eventType = payload["event_type"]
  const occurredAt = payload["occurred_at"]
  const data = asRecord(payload["data"])

  if (typeof eventId !== "string" || eventId.trim().length === 0) {
    throw new PaddleWebhookRequestError("Webhook payload missing event_id", 400)
  }

  if (typeof eventType !== "string" || eventType.trim().length === 0) {
    throw new PaddleWebhookRequestError("Webhook payload missing event_type", 400)
  }

  if (!data) {
    throw new PaddleWebhookRequestError("Webhook payload missing data object", 400)
  }

  return {
    event_id: eventId.trim(),
    event_type: eventType.trim(),
    occurred_at: typeof occurredAt === "string" ? occurredAt : null,
    data,
  }
}

function extractPlanCodeFromItems(
  rawItems: unknown
): Exclude<BillingPlanCode, "FREE"> | null {
  if (!Array.isArray(rawItems)) {
    return null
  }

  for (const rawItem of rawItems) {
    const item = asRecord(rawItem)
    if (!item) {
      continue
    }

    const price = asRecord(item["price"])
    const priceId = typeof price?.["id"] === "string" ? price["id"] : null
    if (!priceId) {
      continue
    }

    const mappedCode = mapPaddlePriceIdToPlanCode({ priceId })
    if (mappedCode) {
      return mappedCode
    }
  }

  return null
}

function resolveTransactionPeriod(data: Record<string, unknown>): {
  currentPeriodStart: Date
  currentPeriodEnd: Date | null
} {
  const billingPeriod = asRecord(data["billing_period"])

  const currentPeriodStart =
    parseDateTime(billingPeriod?.["starts_at"])
    ?? parseDateTime(data["billed_at"])
    ?? parseDateTime(data["updated_at"])
    ?? new Date()

  const currentPeriodEnd = parseDateTime(billingPeriod?.["ends_at"])

  return {
    currentPeriodStart,
    currentPeriodEnd,
  }
}

function resolveSubscriptionPeriod(data: Record<string, unknown>): {
  currentPeriodStart: Date
  currentPeriodEnd: Date | null
} {
  const billingPeriod = asRecord(data["current_billing_period"])

  const currentPeriodStart =
    parseDateTime(billingPeriod?.["starts_at"])
    ?? parseDateTime(data["started_at"])
    ?? parseDateTime(data["updated_at"])
    ?? new Date()

  const currentPeriodEnd =
    parseDateTime(billingPeriod?.["ends_at"])
    ?? parseDateTime(data["next_billed_at"])
    ?? parseDateTime(data["canceled_at"])

  return {
    currentPeriodStart,
    currentPeriodEnd,
  }
}

function resolveCancelAtPeriodEnd(data: Record<string, unknown>): boolean {
  const scheduledChange = asRecord(data["scheduled_change"])
  if (!scheduledChange) {
    return false
  }

  const action =
    typeof scheduledChange["action"] === "string"
      ? scheduledChange["action"].trim().toLowerCase()
      : ""

  return action === "cancel"
}

async function applySubscriptionState(
  tx: Prisma.TransactionClient,
  {
    profileId,
    planCode,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  }: {
    profileId: string
    planCode: Exclude<BillingPlanCode, "FREE">
    status: BillingSubscriptionStatus
    currentPeriodStart: Date
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  }
): Promise<{ planMonthlyCredits: number }> {
  const plan = await tx.billingPlan.findUnique({
    where: {
      code: planCode,
    },
    select: {
      id: true,
      monthlyCredits: true,
    },
  })

  if (!plan) {
    throw new Error(`Missing billing plan: ${planCode}`)
  }

  const existingSubscription = await tx.billingSubscription.findFirst({
    where: {
      profileId,
      planId: plan.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  })

  const nextSubscription = existingSubscription
    ? await tx.billingSubscription.update({
        where: {
          id: existingSubscription.id,
        },
        data: {
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
        select: {
          id: true,
        },
      })
    : await tx.billingSubscription.create({
        data: {
          profileId,
          planId: plan.id,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
        select: {
          id: true,
        },
      })

  if (status !== "CANCELED") {
    await tx.billingSubscription.updateMany({
      where: {
        profileId,
        status: {
          in: ["ACTIVE", "TRIALING", "PAST_DUE"],
        },
        NOT: {
          id: nextSubscription.id,
        },
      },
      data: {
        status: "CANCELED",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: currentPeriodEnd ?? new Date(),
      },
    })
  }

  return {
    planMonthlyCredits: plan.monthlyCredits,
  }
}

async function grantCreditsForTransactionCompleted(
  tx: Prisma.TransactionClient,
  {
    eventId,
    eventType,
    profileId,
    planCode,
    transactionId,
    subscriptionId,
    creditsToGrant,
  }: {
    eventId: string
    eventType: string
    profileId: string
    planCode: Exclude<BillingPlanCode, "FREE">
    transactionId: string | null
    subscriptionId: string | null
    creditsToGrant: number
  }
): Promise<boolean> {
  if (creditsToGrant <= 0) {
    return false
  }

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`

  const existingCredit = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "credit_transactions"
    WHERE "reason" = ${CREDIT_GRANT_REASON}
      AND "metadata"->>'paddleEventId' = ${eventId}
    LIMIT 1
  `

  if (existingCredit.length > 0) {
    return false
  }

  const creditAccount = await tx.creditAccount.upsert({
    where: {
      profileId,
    },
    create: {
      profileId,
      balance: 0,
    },
    update: {},
    select: {
      id: true,
    },
  })

  const updatedAccount = await tx.creditAccount.update({
    where: {
      id: creditAccount.id,
    },
    data: {
      balance: {
        increment: creditsToGrant,
      },
    },
    select: {
      balance: true,
    },
  })

  await tx.creditTransaction.create({
    data: {
      creditAccountId: creditAccount.id,
      direction: "CREDIT",
      amount: creditsToGrant,
      balanceAfter: updatedAccount.balance,
      reason: CREDIT_GRANT_REASON,
      metadata: {
        paddleEventId: eventId,
        paddleEventType: eventType,
        paddleTransactionId: transactionId,
        paddleSubscriptionId: subscriptionId,
        planCode,
      } satisfies Prisma.InputJsonValue,
    },
  })

  return true
}

async function processTransactionCompletedEvent(
  event: PaddleWebhookEnvelope
): Promise<ProcessPaddleWebhookResponse> {
  const profileId = extractVerifiedProfileIdFromPaddleCustomData({
    customData: event.data["custom_data"],
  })

  if (!profileId) {
    return {
      eventId: event.event_id,
      eventType: event.event_type,
      handled: false,
      reason: "missing_or_unverified_profile_context",
    }
  }

  const planCode = extractPlanCodeFromItems(event.data["items"])
  if (!planCode) {
    return {
      eventId: event.event_id,
      eventType: event.event_type,
      handled: false,
      reason: "no_mapped_price_id",
    }
  }

  const profile = await prisma.profile.findUnique({
    where: {
      id: profileId,
    },
    select: {
      id: true,
    },
  })

  if (!profile) {
    return {
      eventId: event.event_id,
      eventType: event.event_type,
      handled: false,
      reason: "profile_not_found",
    }
  }

  const { currentPeriodStart, currentPeriodEnd } = resolveTransactionPeriod(
    event.data
  )

  const transactionId =
    typeof event.data["id"] === "string" ? event.data["id"] : null
  const paddleSubscriptionId =
    typeof event.data["subscription_id"] === "string"
      ? event.data["subscription_id"]
      : null

  let didGrantCredits = false

  await prisma.$transaction(async (tx) => {
    const { planMonthlyCredits } = await applySubscriptionState(tx, {
      profileId,
      planCode,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    })

    didGrantCredits = await grantCreditsForTransactionCompleted(tx, {
      eventId: event.event_id,
      eventType: event.event_type,
      profileId,
      planCode,
      transactionId,
      subscriptionId: paddleSubscriptionId,
      creditsToGrant: planMonthlyCredits,
    })
  })

  return {
    eventId: event.event_id,
    eventType: event.event_type,
    handled: true,
    reason: didGrantCredits ? "subscription_updated_and_credits_granted" : "duplicate_credit_grant_skipped",
  }
}

async function processSubscriptionLifecycleEvent(
  event: PaddleWebhookEnvelope
): Promise<ProcessPaddleWebhookResponse> {
  const profileId = extractVerifiedProfileIdFromPaddleCustomData({
    customData: event.data["custom_data"],
  })

  if (!profileId) {
    return {
      eventId: event.event_id,
      eventType: event.event_type,
      handled: false,
      reason: "missing_or_unverified_profile_context",
    }
  }

  const planCode = extractPlanCodeFromItems(event.data["items"])
  if (!planCode) {
    return {
      eventId: event.event_id,
      eventType: event.event_type,
      handled: false,
      reason: "no_mapped_price_id",
    }
  }

  const profile = await prisma.profile.findUnique({
    where: {
      id: profileId,
    },
    select: {
      id: true,
    },
  })

  if (!profile) {
    return {
      eventId: event.event_id,
      eventType: event.event_type,
      handled: false,
      reason: "profile_not_found",
    }
  }

  const status = mapPaddleSubscriptionStatus(
    event.data["status"],
    event.event_type
  )
  const { currentPeriodStart, currentPeriodEnd } = resolveSubscriptionPeriod(
    event.data
  )

  await prisma.$transaction(async (tx) => {
    await applySubscriptionState(tx, {
      profileId,
      planCode,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: resolveCancelAtPeriodEnd(event.data),
    })
  })

  return {
    eventId: event.event_id,
    eventType: event.event_type,
    handled: true,
    reason: "subscription_status_updated",
  }
}

export async function processPaddleWebhookUseCase({
  rawBody,
  paddleSignatureHeader,
}: ProcessPaddleWebhookRequest): Promise<ProcessPaddleWebhookResponse> {
  if (typeof rawBody !== "string" || rawBody.trim().length === 0) {
    throw new PaddleWebhookRequestError("Webhook body is empty", 400)
  }

  try {
    assertValidPaddleWebhookSignature({
      rawBody,
      paddleSignatureHeader,
    })
  } catch (error) {
    throw new PaddleWebhookRequestError(
      error instanceof Error ? error.message : "Invalid webhook signature",
      401
    )
  }

  const event = parseWebhookEnvelope(rawBody)

  if (event.event_type === "transaction.completed") {
    return processTransactionCompletedEvent(event)
  }

  if (event.event_type.startsWith("subscription.")) {
    return processSubscriptionLifecycleEvent(event)
  }

  return {
    eventId: event.event_id,
    eventType: event.event_type,
    handled: false,
    reason: "event_type_not_handled",
  }
}
