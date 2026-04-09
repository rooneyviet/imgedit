import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"

import {
  assertValidPaddleWebhookSignature,
  createPaddleCustomDataSignature,
  extractVerifiedProfileIdFromPaddleCustomData,
  mapPaddlePriceIdToPlanCode,
} from "@/lib/server/paddle-config"

describe("paddle-config", () => {
  const profileId = "0f49a587-e806-45f6-9917-f9df7e63f4ff"

  it("creates and verifies signed custom data", () => {
    const signedAt = 1_712_603_200
    const env = {
      SUPABASE_JWT_SECRET:
        "super-secret-jwt-token-min-32-characters-for-tests-only",
    }

    const signature = createPaddleCustomDataSignature({
      profileId,
      signedAt,
      env,
    })

    const verifiedProfileId = extractVerifiedProfileIdFromPaddleCustomData({
      customData: {
        profileId,
        signedAt,
        signature,
      },
      env,
    })

    expect(verifiedProfileId).toBe(profileId)
  })

  it("allows unsigned custom data only in sandbox", () => {
    expect(
      extractVerifiedProfileIdFromPaddleCustomData({
        customData: { profileId },
        env: { PADDLE_ENV: "sandbox" },
      })
    ).toBe(profileId)

    expect(
      extractVerifiedProfileIdFromPaddleCustomData({
        customData: { profileId },
        env: { PADDLE_ENV: "production" },
      })
    ).toBeNull()
  })

  it("verifies a valid webhook signature", () => {
    const rawBody =
      '{"event_id":"evt_01","event_type":"transaction.completed","data":{}}'
    const timestamp = Math.floor(Date.now() / 1000)
    const secret = "pdl_ntfset_test_secret"

    const digest = createHmac("sha256", secret)
      .update(`${timestamp}:${rawBody}`, "utf8")
      .digest("hex")

    expect(() => {
      assertValidPaddleWebhookSignature({
        rawBody,
        paddleSignatureHeader: `ts=${timestamp};h1=${digest}`,
        env: {
          PADDLE_ENV: "sandbox",
          PADDLE_WEBHOOK_SECRET: secret,
          PADDLE_WEBHOOK_TOLERANCE_SECONDS: "300",
        },
      })
    }).not.toThrow()
  })

  it("throws when webhook signature is invalid", () => {
    const timestamp = Math.floor(Date.now() / 1000)

    expect(() => {
      assertValidPaddleWebhookSignature({
        rawBody:
          '{"event_id":"evt_02","event_type":"transaction.completed","data":{}}',
        paddleSignatureHeader: `ts=${timestamp};h1=deadbeef`,
        env: {
          PADDLE_ENV: "sandbox",
          PADDLE_WEBHOOK_SECRET: "pdl_ntfset_test_secret",
          PADDLE_WEBHOOK_TOLERANCE_SECONDS: "300",
        },
      })
    }).toThrow("Paddle webhook signature is invalid")
  })

  it("maps configured Paddle price IDs to billing plans", () => {
    expect(
      mapPaddlePriceIdToPlanCode({
        priceId: "pri_monthly",
        env: {
          PADDLE_PRICE_ID_MONTHLY: "pri_monthly",
          PADDLE_PRICE_ID_ANNUAL: "pri_annual",
        },
      })
    ).toBe("MONTHLY")

    expect(
      mapPaddlePriceIdToPlanCode({
        priceId: "pri_annual",
        env: {
          PADDLE_PRICE_ID_MONTHLY: "pri_monthly",
          PADDLE_PRICE_ID_ANNUAL: "pri_annual",
        },
      })
    ).toBe("ANNUAL")

    expect(
      mapPaddlePriceIdToPlanCode({
        priceId: "pri_unknown",
        env: {
          PADDLE_PRICE_ID_MONTHLY: "pri_monthly",
          PADDLE_PRICE_ID_ANNUAL: "pri_annual",
        },
      })
    ).toBeNull()
  })
})
