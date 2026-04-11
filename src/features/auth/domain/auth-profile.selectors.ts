import type { PricingCatalog } from "@/lib/server/application/get-pricing-catalog.service"

import type { SyncedProfileSnapshot } from "./synced-profile"

type AuthIdentity = {
  isAuthenticated: boolean
  userDisplayName: string | null
  userEmail: string | null
}

type SelectResolvedAuthProfileInput = {
  auth: AuthIdentity
  profileSnapshot: SyncedProfileSnapshot | null
  operationCosts?: PricingCatalog["operationCosts"]
}

export type ResolvedAuthProfile = {
  userDisplayName: string | null
  userEmail: string | null
  remainingCredits: number | null
  normalImageCreditCost: number
  upscale4kCreditCost: number
  activePlanCode: "FREE" | "MONTHLY" | "ANNUAL" | null
  userLabel: string
}

function selectUserLabel({
  isAuthenticated,
  userDisplayName,
  userEmail,
}: {
  isAuthenticated: boolean
  userDisplayName: string | null
  userEmail: string | null
}): string {
  return userDisplayName || userEmail || (isAuthenticated ? "USER" : "GUEST")
}

export function selectResolvedAuthProfile({
  auth,
  profileSnapshot,
  operationCosts,
}: SelectResolvedAuthProfileInput): ResolvedAuthProfile {
  const userDisplayName =
    profileSnapshot?.userDisplayName ?? auth.userDisplayName
  const userEmail = profileSnapshot?.userEmail ?? auth.userEmail

  return {
    userDisplayName,
    userEmail,
    remainingCredits: profileSnapshot?.remainingCredits ?? null,
    normalImageCreditCost:
      profileSnapshot?.normalImageCreditCost ??
      operationCosts?.normalImage ??
      0,
    upscale4kCreditCost: operationCosts?.upscale4k ?? 0,
    activePlanCode: profileSnapshot?.activePlanCode ?? null,
    userLabel: selectUserLabel({
      isAuthenticated: auth.isAuthenticated,
      userDisplayName,
      userEmail,
    }),
  }
}
