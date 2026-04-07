import { createServerFn } from "@tanstack/react-start"

import { requireAuthenticatedUser } from "./auth"
import {
  ensureUserBillingState,
  getNormalImageUnitCost,
  syncCreditsAndBillingCatalog,
} from "./credits"
import { prisma } from "./prisma"

type SyncUserProfileRequest = {
  accessToken: string
}

type SyncUserProfileResponse = {
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

export const syncUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input: SyncUserProfileRequest) => input)
  .handler(async ({ data }): Promise<SyncUserProfileResponse> => {
    await syncCreditsAndBillingCatalog()

    const user = await requireAuthenticatedUser(data.accessToken)
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
    const normalImageCredits = await getNormalImageUnitCost()

    return {
      profile: {
        ...profile,
        remainingCredits: billingState.remainingCredits,
      },
      pricing: {
        normalImageCredits,
      },
    }
  })
