import type { SyncUserProfileResponse } from "@/lib/server/sync-user-profile"

export type SyncedProfile = {
  id: string
  email: string | null
  displayName: string | null
  remainingCredits: number
  normalImageCredits: number
}

export type SyncedProfileSnapshot = {
  userEmail: string | null
  userDisplayName: string | null
  remainingCredits: number
  normalImageCreditCost: number
}

export function toSyncedProfile(
  response: SyncUserProfileResponse
): SyncedProfile {
  return {
    id: response.profile.id,
    email: response.profile.email,
    displayName: response.profile.displayName,
    remainingCredits: response.profile.remainingCredits,
    normalImageCredits: response.pricing.normalImageCredits,
  }
}

export function selectSyncedProfileSnapshot(
  profile: SyncedProfile
): SyncedProfileSnapshot {
  return {
    userEmail: profile.email,
    userDisplayName: profile.displayName,
    remainingCredits: profile.remainingCredits,
    normalImageCreditCost: profile.normalImageCredits,
  }
}
