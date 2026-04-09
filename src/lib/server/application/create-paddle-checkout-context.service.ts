import { requireAuthenticatedUser } from "../auth"
import { createPaddleCustomDataSignature } from "../paddle-config"

export type CreatePaddleCheckoutContextRequest = {
  accessToken: string
}

export type CreatePaddleCheckoutContextResponse = {
  profileId: string
  email: string | null
  signedAt: number
  signature: string
}

export async function createPaddleCheckoutContextUseCase(
  rawInput: unknown
): Promise<CreatePaddleCheckoutContextResponse> {
  if (!rawInput || typeof rawInput !== "object") {
    throw new Error("Invalid request payload")
  }

  const input = rawInput as Partial<CreatePaddleCheckoutContextRequest>
  const accessToken = (input.accessToken ?? "").trim()
  if (!accessToken) {
    throw new Error("Access token is required")
  }

  const user = await requireAuthenticatedUser(accessToken)
  const signedAt = Math.floor(Date.now() / 1000)

  return {
    profileId: user.id,
    email: user.email,
    signedAt,
    signature: createPaddleCustomDataSignature({
      profileId: user.id,
      signedAt,
    }),
  }
}
