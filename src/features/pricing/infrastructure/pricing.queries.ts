import { queryOptions } from "@tanstack/react-query"

import { selectPricingPageModel } from "@/features/pricing/domain/pricing.selectors"
import { getPricingCatalog } from "@/lib/server/get-pricing-catalog"

export const pricingQueryKeys = {
  all: ["pricing"] as const,
  catalog: () => [...pricingQueryKeys.all, "catalog"] as const,
}

export function createPricingCatalogQueryOptions() {
  return queryOptions({
    queryKey: pricingQueryKeys.catalog(),
    queryFn: async () => {
      return getPricingCatalog()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function createPricingPageQueryOptions() {
  return {
    ...createPricingCatalogQueryOptions(),
    select: selectPricingPageModel,
  } as const
}
