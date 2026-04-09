import { createFileRoute } from "@tanstack/react-router"

import {
  PaddleWebhookRequestError,
  processPaddleWebhookUseCase,
} from "@/lib/server/application/process-paddle-webhook.service"

export const Route = createFileRoute("/api/paddle/webhook")({
  server: {
    handlers: {
      GET: async () => {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            Allow: "POST",
          },
        })
      },
      POST: async ({ request }) => {
        const rawBody = await request.text()
        const paddleSignatureHeader = request.headers.get("paddle-signature")

        try {
          const result = await processPaddleWebhookUseCase({
            rawBody,
            paddleSignatureHeader,
          })

          return Response.json(result, {
            status: 200,
          })
        } catch (error) {
          if (error instanceof PaddleWebhookRequestError) {
            return Response.json(
              {
                error: error.message,
              },
              {
                status: error.statusCode,
              }
            )
          }

          console.error("Unhandled Paddle webhook error", error)

          return Response.json(
            {
              error: "internal_server_error",
            },
            {
              status: 500,
            }
          )
        }
      },
    },
  },
})
