import { createServerFn } from "@tanstack/react-start"

import {
  createPaddleCheckoutContextUseCase,
  type CreatePaddleCheckoutContextRequest,
  type CreatePaddleCheckoutContextResponse,
} from "./application/create-paddle-checkout-context.service"

export type {
  CreatePaddleCheckoutContextRequest,
  CreatePaddleCheckoutContextResponse,
}

export const createPaddleCheckoutContext = createServerFn({ method: "POST" })
  .inputValidator(
    (input: CreatePaddleCheckoutContextRequest) => input
  )
  .handler(async ({ data }): Promise<CreatePaddleCheckoutContextResponse> => {
    return createPaddleCheckoutContextUseCase(data)
  })
