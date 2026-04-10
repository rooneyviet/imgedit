import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getFreePlanButtonState,
  getPaidPlanButtonState,
} from "@/features/pricing/domain/pricing.helpers"
import {
  createPaddleQueryOptions,
  readClientPriceId,
} from "@/features/pricing/infrastructure/paddle.queries"
import type { CreatePaddleCheckoutContextResponse } from "@/lib/server/create-paddle-checkout-context"

type PaidPlanCode = "MONTHLY" | "ANNUAL"

export type PricingCheckoutServices = {
  createCheckoutContext: (
    planCode: PaidPlanCode
  ) => Promise<CreatePaddleCheckoutContextResponse>
}

export type UsePricingCheckoutControllerOptions = {
  services: PricingCheckoutServices
  activePlanCode: "FREE" | "MONTHLY" | "ANNUAL" | null
}

export type PricingCheckoutController = {
  checkoutError: string | null
  isPaddleReady: boolean
  freePlanButton: { label: string; disabled: boolean }
  monthlyPlanButton: { label: string; disabled: boolean; onChoose: () => void }
  annualPlanButton: { label: string; disabled: boolean; onChoose: () => void }
}

export function usePricingCheckoutController({
  services,
  activePlanCode,
}: UsePricingCheckoutControllerOptions): PricingCheckoutController {
  const queryClient = useQueryClient()

  const paddleQuery = useQuery(createPaddleQueryOptions({ queryClient }))
  const paddle = paddleQuery.data ?? null

  const [checkoutError, setCheckoutError] = useState<string | null>(
    paddleQuery.isError ? "Unable to load Paddle checkout." : null
  )
  const [pendingPlanCode, setPendingPlanCode] = useState<PaidPlanCode | null>(
    null
  )

  const isPaddleReady = paddle !== null

  const freePlanButton = getFreePlanButtonState(activePlanCode)
  const monthlyPlanButton = getPaidPlanButtonState(
    activePlanCode,
    "MONTHLY",
    pendingPlanCode
  )
  const annualPlanButton = getPaidPlanButtonState(
    activePlanCode,
    "ANNUAL",
    pendingPlanCode
  )

  async function openCheckout(planCode: PaidPlanCode) {
    setCheckoutError(null)

    if (!paddle) {
      setCheckoutError("Billing checkout is still loading. Please retry.")
      return
    }

    const priceId = readClientPriceId(planCode)
    if (!priceId) {
      setCheckoutError("Billing plan is not configured.")
      return
    }

    setPendingPlanCode(planCode)

    try {
      const checkoutContext = await services.createCheckoutContext(planCode)

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: checkoutContext.email
          ? { email: checkoutContext.email }
          : undefined,
        customData: {
          profileId: checkoutContext.profileId,
          signedAt: checkoutContext.signedAt,
          signature: checkoutContext.signature,
        },
        settings: {
          displayMode: "overlay",
          theme: "light",
        },
      })
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Failed to open checkout."
      )
    } finally {
      setPendingPlanCode(null)
    }
  }

  return {
    checkoutError,
    isPaddleReady,
    freePlanButton,
    monthlyPlanButton: {
      ...monthlyPlanButton,
      disabled: monthlyPlanButton.disabled || !isPaddleReady,
      onChoose: () => {
        void openCheckout("MONTHLY")
      },
    },
    annualPlanButton: {
      ...annualPlanButton,
      disabled: annualPlanButton.disabled || !isPaddleReady,
      onChoose: () => {
        void openCheckout("ANNUAL")
      },
    },
  }
}
