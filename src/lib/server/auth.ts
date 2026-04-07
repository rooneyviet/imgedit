import { jwtVerify, type JWTPayload } from "jose"

type UserMetadata = Record<string, unknown>

export type AuthenticatedUser = {
  id: string
  email: string | null
  userMetadata: UserMetadata
}

type SupabaseUserResponse = {
  id: string
  email?: string | null
  user_metadata?: UserMetadata | null
}

function parseAccessToken(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Access token is required")
  }
  return input.trim()
}

function parseJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("SUPABASE_JWT_SECRET is missing or too short")
  }
  return new TextEncoder().encode(secret)
}

async function verifySupabaseToken(accessToken: string): Promise<JWTPayload> {
  const secret = parseJwtSecret()
  const { payload } = await jwtVerify(accessToken, secret, {
    algorithms: ["HS256"],
    audience: "authenticated",
  })
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid token subject")
  }
  return payload
}

function getSupabaseInternalAuthUrl(): string {
  return (
    process.env.SUPABASE_AUTH_INTERNAL_URL ||
    process.env.SUPABASE_AUTH_EXTERNAL_URL ||
    "http://supabase-auth:9999"
  )
}

function buildUserEndpoint(): string {
  const base = getSupabaseInternalAuthUrl().replace(/\/+$/, "")
  return `${base}/user`
}

async function fetchSupabaseUser(
  accessToken: string
): Promise<SupabaseUserResponse | null> {
  const response = await fetch(buildUserEndpoint(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as Partial<SupabaseUserResponse>
  if (!data.id || typeof data.id !== "string") {
    return null
  }

  return {
    id: data.id,
    email: typeof data.email === "string" ? data.email : null,
    user_metadata:
      data.user_metadata && typeof data.user_metadata === "object"
        ? data.user_metadata
        : {},
  }
}

export async function requireAuthenticatedUser(
  rawAccessToken: unknown
): Promise<AuthenticatedUser> {
  const accessToken = parseAccessToken(rawAccessToken)
  const payload = await verifySupabaseToken(accessToken)
  const supabaseUser = await fetchSupabaseUser(accessToken)

  const payloadEmail =
    typeof payload.email === "string" && payload.email.length > 0
      ? payload.email
      : null
  const subject = payload.sub as string

  if (supabaseUser && supabaseUser.id !== subject) {
    throw new Error("Token user mismatch")
  }

  return {
    id: supabaseUser?.id ?? subject,
    email: supabaseUser?.email ?? payloadEmail,
    userMetadata:
      supabaseUser?.user_metadata && typeof supabaseUser.user_metadata === "object"
        ? supabaseUser.user_metadata
        : {},
  }
}

