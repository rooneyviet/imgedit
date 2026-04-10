import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useAppAuth } from "@/features/auth/app-auth-context"
import { usePricingCheckoutServerServices } from "@/features/pricing/infrastructure/pricing-checkout.server-services"
import {
  createPricingCatalogQueryOptions,
  createPricingPageQueryOptions,
} from "@/features/pricing/infrastructure/pricing.queries"
import { PricingPage } from "@/features/pricing/pricing-page"
import { usePricingCheckout } from "@/features/pricing/use-pricing-checkout"

export const Route = createFileRoute("/pricing")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      createPricingCatalogQueryOptions()
    )
  },
  component: PricingRoute,
})

function PricingRoute() {
  const auth = useAppAuth()
  const { data: pricing } = useSuspenseQuery(createPricingPageQueryOptions())

  const services = usePricingCheckoutServerServices({
    accessToken: auth.accessToken,
    onUnauthorized: auth.openLoginDialog,
  })

  const controller = usePricingCheckout({
    services,
    activePlanCode: auth.activePlanCode,
  })

  return <PricingPage controller={controller} pricing={pricing} />
}
