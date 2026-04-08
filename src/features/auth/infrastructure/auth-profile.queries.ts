import { queryOptions, type QueryClient } from "@tanstack/react-query"

import {
  selectSyncedProfileSnapshot,
  toSyncedProfile,
  type SyncedProfile,
  type SyncedProfileSnapshot,
} from "@/features/auth/domain/synced-profile"
import type { SyncUserProfileResponse } from "@/lib/server/sync-user-profile"

export const authProfileQueryKeys = {
  all: ["auth-profile"] as const,
  byAccessToken: (accessToken: string) =>
    [...authProfileQueryKeys.all, accessToken] as const,
}

export type SyncUserProfileServerFn = (options: {
  data: {
    accessToken: string
  }
}) => Promise<SyncUserProfileResponse>

export function createAuthProfileQueryOptions({
  accessToken,
  syncUserProfile,
}: {
  accessToken: string
  syncUserProfile: SyncUserProfileServerFn
}) {
  return queryOptions({
    queryKey: authProfileQueryKeys.byAccessToken(accessToken),
    queryFn: async (): Promise<SyncedProfile> => {
      const response = await syncUserProfile({
        data: {
          accessToken,
        },
      })

      return toSyncedProfile(response)
    },
  })
}

export function createAuthProfileSnapshotQueryOptions({
  accessToken,
  syncUserProfile,
}: {
  accessToken: string
  syncUserProfile: SyncUserProfileServerFn
}) {
  return {
    ...createAuthProfileQueryOptions({
      accessToken,
      syncUserProfile,
    }),
    select: selectSyncedProfileSnapshot,
  } as const
}

export function updateCachedRemainingCredits({
  queryClient,
  accessToken,
  remainingCredits,
}: {
  queryClient: QueryClient
  accessToken: string | null
  remainingCredits: number
}) {
  if (!accessToken) {
    return
  }

  const safeRemainingCredits = Math.max(0, Math.floor(remainingCredits))

  queryClient.setQueryData<SyncedProfile>(
    authProfileQueryKeys.byAccessToken(accessToken),
    (previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        remainingCredits: safeRemainingCredits,
      }
    }
  )
}

export function getCachedAuthProfileSnapshot({
  queryClient,
  accessToken,
}: {
  queryClient: QueryClient
  accessToken: string | null
}): SyncedProfileSnapshot | null {
  if (!accessToken) {
    return null
  }

  const profile = queryClient.getQueryData<SyncedProfile>(
    authProfileQueryKeys.byAccessToken(accessToken)
  )

  if (!profile) {
    return null
  }

  return selectSyncedProfileSnapshot(profile)
}
