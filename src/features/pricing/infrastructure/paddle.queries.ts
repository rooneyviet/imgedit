import { initializePaddle } from "@paddle/paddle-js"
import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { authProfileQueryKeys } from "@/features/auth/infrastructure/auth-profile.queries"

function readClientPaddleEnvironment(): "sandbox" | "production" {
  const rawEnvironment = (import.meta.env.VITE_PADDLE_ENV ?? "sandbox")
    .toString()
    .trim()
    .toLowerCase()

  return rawEnvironment === "production" ? "production" : "sandbox"
}

function readClientPaddleToken(): string {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
  return typeof token === "string" ? token.trim() : ""
}

export function readClientPriceId(
  planCode: "MONTHLY" | "ANNUAL"
): string | null {
  if (planCode === "MONTHLY") {
    const priceId = import.meta.env.VITE_PADDLE_PRICE_ID_MONTHLY
    return typeof priceId === "string" && priceId.trim().length > 0
      ? priceId.trim()
      : null
  }

  const priceId = import.meta.env.VITE_PADDLE_PRICE_ID_ANNUAL
  return typeof priceId === "string" && priceId.trim().length > 0
    ? priceId.trim()
    : null
}

const paddleQueryKeys = {
  all: ["paddle"] as const,
}

export function createPaddleQueryOptions({
  queryClient,
}: {
  queryClient: QueryClient
}) {
  return queryOptions({
    queryKey: paddleQueryKeys.all,
    queryFn: async () => {
      const clientToken = readClientPaddleToken()
      if (!clientToken) {
        return null
      }

      const paddle = await initializePaddle({
        environment: readClientPaddleEnvironment(),
        token: clientToken,
        eventCallback: (event) => {
          if (event.name === "checkout.completed") {
            void queryClient.invalidateQueries({
              queryKey: authProfileQueryKeys.all,
            })

            setTimeout(() => {
              void queryClient.invalidateQueries({
                queryKey: authProfileQueryKeys.all,
              })
            }, 3_000)

            setTimeout(() => {
              void queryClient.invalidateQueries({
                queryKey: authProfileQueryKeys.all,
              })
            }, 7_000)
          }
        },
      })

      return paddle ?? null
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}
