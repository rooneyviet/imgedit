import { createServerFn } from "@tanstack/react-start"

import {
  getPricingCatalogUseCase,
  type PricingCatalog,
} from "./application/get-pricing-catalog.service"

export type { PricingCatalog }

export const getPricingCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricingCatalog> => {
    return getPricingCatalogUseCase()
  }
)
