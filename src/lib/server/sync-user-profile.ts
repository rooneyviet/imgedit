import { createServerFn } from "@tanstack/react-start"

import {
  syncUserProfileUseCase,
  type SyncUserProfileRequest,
  type SyncUserProfileResponse,
} from "./application/sync-user-profile.service"

export type { SyncUserProfileRequest, SyncUserProfileResponse }

export const syncUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input: SyncUserProfileRequest) => input)
  .handler(async ({ data }): Promise<SyncUserProfileResponse> => {
    return syncUserProfileUseCase(data)
  })
