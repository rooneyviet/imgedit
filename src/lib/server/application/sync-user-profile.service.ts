import { requireAuthenticatedUser } from "../auth"
import { readBillingCreditConfig } from "../billing-config"
import { ensureUserBillingState } from "../credits"
import { prisma } from "../prisma"

export type SyncUserProfileRequest = {
  accessToken: string
}

export type SyncUserProfileResponse = {
  profile: {
    id: string
    email: string | null
    displayName: string | null
    remainingCredits: number
  }
  pricing: {
    normalImageCredits: number
  }
}

function parseDisplayName(metadata: Record<string, unknown>): string | null {
  const displayName = metadata["display_name"]
  if (typeof displayName === "string" && displayName.trim().length > 0) {
    return displayName.trim()
  }

  const fullName = metadata["full_name"]
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim()
  }

  const name = metadata["name"]
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim()
  }

  return null
}

export async function syncUserProfileUseCase(
  rawInput: unknown
): Promise<SyncUserProfileResponse> {
  if (!rawInput || typeof rawInput !== "object") {
    throw new Error("Invalid request payload")
  }

  const input = rawInput as Partial<SyncUserProfileRequest>
  const accessToken = (input.accessToken ?? "").trim()
  if (!accessToken) {
    throw new Error("Access token is required")
  }

  const user = await requireAuthenticatedUser(accessToken)
  const displayName = parseDisplayName(user.userMetadata)

  const profile = await prisma.profile.upsert({
    where: {
      id: user.id,
    },
    create: {
      id: user.id,
      email: user.email,
      displayName,
    },
    update: {
      email: user.email,
      displayName,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  })

  const billingState = await ensureUserBillingState(profile.id)
  const config = readBillingCreditConfig()

  return {
    profile: {
      ...profile,
      remainingCredits: billingState.remainingCredits,
    },
    pricing: {
      normalImageCredits: config.creditCostNormalImage,
    },
  }
}
