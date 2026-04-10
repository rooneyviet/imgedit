import { useMemo } from "react"
import { useServerFn } from "@tanstack/react-start"

import type { PricingCheckoutServices } from "@/features/pricing/application/use-pricing-checkout-controller"
import { createPaddleCheckoutContext } from "@/lib/server/create-paddle-checkout-context"

type UsePricingCheckoutServerServicesOptions = {
  accessToken: string | null
  onUnauthorized: () => void
}

function requireAccessToken(
  accessToken: string | null,
  onUnauthorized: () => void
): string {
  if (accessToken) {
    return accessToken
  }

  onUnauthorized()
  throw new Error("Please sign in to continue")
}

export function usePricingCheckoutServerServices({
  accessToken,
  onUnauthorized,
}: UsePricingCheckoutServerServicesOptions): PricingCheckoutServices {
  const createPaddleCheckoutContextServerFn = useServerFn(
    createPaddleCheckoutContext
  )

  return useMemo<PricingCheckoutServices>(() => {
    return {
      createCheckoutContext: async (planCode) => {
        const token = requireAccessToken(accessToken, onUnauthorized)

        return createPaddleCheckoutContextServerFn({
          data: {
            accessToken: token,
            planCode,
          },
        })
      },
    }
  }, [accessToken, createPaddleCheckoutContextServerFn, onUnauthorized])
}
