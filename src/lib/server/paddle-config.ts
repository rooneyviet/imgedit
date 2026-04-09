import { createHmac, timingSafeEqual } from "node:crypto"

import type {
  BillingPlanCode,
  BillingSubscriptionStatus,
} from "../../../generated/prisma/enums"

const DEFAULT_PADDLE_ENV = "sandbox"
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300

const PROFILE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PaddleEnvironment = "sandbox" | "production"

type PaddleSignatureParts = {
  timestamp: number
  signatures: string[]
}

type PaddleProfileContext = {
  profileId: string
  signedAt: number | null
  signature: string | null
}

function readNonEmptyString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  return trimmed
}

function readEnvironment(
  env: Record<string, string | undefined> = process.env
): PaddleEnvironment {
  const value = (env.PADDLE_ENV ?? DEFAULT_PADDLE_ENV).trim().toLowerCase()
  if (value === "sandbox" || value === "production") {
    return value
  }

  throw new Error("PADDLE_ENV must be either sandbox or production")
}

function readWebhookToleranceSeconds(
  env: Record<string, string | undefined> = process.env
): number {
  const rawValue = env.PADDLE_WEBHOOK_TOLERANCE_SECONDS
  if (!rawValue || rawValue.trim().length === 0) {
    return DEFAULT_WEBHOOK_TOLERANCE_SECONDS
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("PADDLE_WEBHOOK_TOLERANCE_SECONDS must be a non-negative integer")
  }

  return parsed
}

function parsePaddleSignatureHeader(
  headerValue: string
): PaddleSignatureParts {
  const segments = headerValue
    .split(";")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  const timestampPart = segments.find((segment) => segment.startsWith("ts="))
  const signatureParts = segments
    .filter((segment) => segment.startsWith("h1="))
    .map((segment) => segment.slice(3))
    .filter((segment) => segment.length > 0)

  if (!timestampPart || signatureParts.length === 0) {
    throw new Error("Paddle-Signature header is malformed")
  }

  const timestamp = Number.parseInt(timestampPart.slice(3), 10)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("Paddle-Signature timestamp is invalid")
  }

  return {
    timestamp,
    signatures: signatureParts,
  }
}

function isSafeEqualHexSignature(expectedHex: string, actualHex: string): boolean {
  const expectedBuffer = Buffer.from(expectedHex, "hex")
  const actualBuffer = Buffer.from(actualHex, "hex")

  if (expectedBuffer.length === 0 || actualBuffer.length === 0) {
    return false
  }

  if (expectedBuffer.length !== actualBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, actualBuffer)
}

function readWebhookSecret(
  env: Record<string, string | undefined> = process.env
): string | null {
  return readNonEmptyString(env.PADDLE_WEBHOOK_SECRET)
}

function readCustomDataSigningSecret(
  env: Record<string, string | undefined> = process.env
): string {
  const secret = readNonEmptyString(env.PADDLE_CUSTOM_DATA_SIGNING_SECRET)
    ?? readNonEmptyString(env.SUPABASE_JWT_SECRET)

  if (!secret || secret.length < 16) {
    throw new Error(
      "PADDLE_CUSTOM_DATA_SIGNING_SECRET (or SUPABASE_JWT_SECRET fallback) is missing or too short"
    )
  }

  return secret
}

export function assertValidPaddleWebhookSignature({
  rawBody,
  paddleSignatureHeader,
  env = process.env,
}: {
  rawBody: string
  paddleSignatureHeader: string | null
  env?: Record<string, string | undefined>
}): void {
  const environment = readEnvironment(env)
  const webhookSecret = readWebhookSecret(env)

  // Allow skipping verification in sandbox only when a webhook secret isn't configured yet.
  if (!webhookSecret) {
    if (environment === "sandbox") {
      console.warn(
        "PADDLE_WEBHOOK_SECRET is not set. Skipping signature verification in sandbox."
      )
      return
    }

    throw new Error("PADDLE_WEBHOOK_SECRET is required in production")
  }

  if (!paddleSignatureHeader) {
    throw new Error("Paddle-Signature header is missing")
  }

  const signature = parsePaddleSignatureHeader(paddleSignatureHeader)
  const toleranceSeconds = readWebhookToleranceSeconds(env)

  if (toleranceSeconds > 0) {
    const now = Math.floor(Date.now() / 1000)
    const age = Math.abs(now - signature.timestamp)
    if (age > toleranceSeconds) {
      throw new Error("Paddle webhook timestamp is outside tolerance")
    }
  }

  const signedPayload = `${signature.timestamp}:${rawBody}`
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex")

  const isValid = signature.signatures.some((providedSignature) => {
    return isSafeEqualHexSignature(expectedSignature, providedSignature)
  })

  if (!isValid) {
    throw new Error("Paddle webhook signature is invalid")
  }
}

function parseProfileContext(customData: unknown): PaddleProfileContext | null {
  if (!customData || typeof customData !== "object") {
    return null
  }

  const profileIdRaw = (customData as Record<string, unknown>)["profileId"]
  const signedAtRaw = (customData as Record<string, unknown>)["signedAt"]
  const signatureRaw = (customData as Record<string, unknown>)["signature"]

  if (typeof profileIdRaw !== "string") {
    return null
  }

  const profileId = profileIdRaw.trim()
  if (!PROFILE_ID_PATTERN.test(profileId)) {
    return null
  }

  const signedAt =
    typeof signedAtRaw === "number"
      ? Math.floor(signedAtRaw)
      : typeof signedAtRaw === "string"
        ? Number.parseInt(signedAtRaw, 10)
        : null

  return {
    profileId,
    signedAt:
      typeof signedAt === "number" && Number.isFinite(signedAt) && signedAt > 0
        ? signedAt
        : null,
    signature:
      typeof signatureRaw === "string" && signatureRaw.trim().length > 0
        ? signatureRaw.trim()
        : null,
  }
}

function createProfileContextSignature({
  profileId,
  signedAt,
  secret,
}: {
  profileId: string
  signedAt: number
  secret: string
}): string {
  return createHmac("sha256", secret)
    .update(`${profileId}.${signedAt}`, "utf8")
    .digest("hex")
}

export function createPaddleCustomDataSignature({
  profileId,
  signedAt,
  env = process.env,
}: {
  profileId: string
  signedAt: number
  env?: Record<string, string | undefined>
}): string {
  const secret = readCustomDataSigningSecret(env)
  return createProfileContextSignature({
    profileId,
    signedAt,
    secret,
  })
}

export function extractVerifiedProfileIdFromPaddleCustomData({
  customData,
  env = process.env,
}: {
  customData: unknown
  env?: Record<string, string | undefined>
}): string | null {
  const profileContext = parseProfileContext(customData)
  if (!profileContext) {
    return null
  }

  const environment = readEnvironment(env)

  // Backward-compatible fallback for sandbox payloads that don't include signed metadata.
  if (!profileContext.signature || !profileContext.signedAt) {
    if (environment === "sandbox") {
      return profileContext.profileId
    }

    return null
  }

  const expectedSignature = createPaddleCustomDataSignature({
    profileId: profileContext.profileId,
    signedAt: profileContext.signedAt,
    env,
  })

  if (!isSafeEqualHexSignature(expectedSignature, profileContext.signature)) {
    return null
  }

  return profileContext.profileId
}

function readPriceIdMap(
  env: Record<string, string | undefined> = process.env
): Record<string, BillingPlanCode> {
  const monthlyPriceId =
    readNonEmptyString(env.PADDLE_PRICE_ID_MONTHLY)
    ?? readNonEmptyString(env.VITE_PADDLE_PRICE_ID_MONTHLY)
  const annualPriceId =
    readNonEmptyString(env.PADDLE_PRICE_ID_ANNUAL)
    ?? readNonEmptyString(env.VITE_PADDLE_PRICE_ID_ANNUAL)

  const map: Record<string, BillingPlanCode> = {}
  if (monthlyPriceId) {
    map[monthlyPriceId] = "MONTHLY"
  }

  if (annualPriceId) {
    map[annualPriceId] = "ANNUAL"
  }

  return map
}

export function mapPaddlePriceIdToPlanCode({
  priceId,
  env = process.env,
}: {
  priceId: string
  env?: Record<string, string | undefined>
}): Exclude<BillingPlanCode, "FREE"> | null {
  const normalizedPriceId = priceId.trim()
  if (!normalizedPriceId) {
    return null
  }

  const map = readPriceIdMap(env)
  const mappedCode = map[normalizedPriceId]
  if (!mappedCode || mappedCode === "FREE") {
    return null
  }

  return mappedCode
}

export function mapPaddleSubscriptionStatus(
  rawStatus: unknown,
  eventType: string
): BillingSubscriptionStatus {
  if (typeof rawStatus === "string") {
    const normalizedStatus = rawStatus.trim().toLowerCase()
    switch (normalizedStatus) {
      case "active":
        return "ACTIVE"
      case "trialing":
        return "TRIALING"
      case "past_due":
        return "PAST_DUE"
      case "canceled":
        return "CANCELED"
      case "paused":
        return "PAST_DUE"
      default:
        break
    }
  }

  if (eventType === "subscription.canceled") {
    return "CANCELED"
  }

  if (eventType === "subscription.past_due") {
    return "PAST_DUE"
  }

  if (eventType === "subscription.trialing") {
    return "TRIALING"
  }

  return "ACTIVE"
}

export function readPaddleEnvironment(
  env: Record<string, string | undefined> = process.env
): PaddleEnvironment {
  return readEnvironment(env)
}
