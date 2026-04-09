import { useCallback, useEffect, useState } from "react"
import type { Paddle } from "@paddle/paddle-js"
import { Check, Coins } from "lucide-react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import { AppFooter } from "@/components/app-footer"
import { Button } from "@/components/ui/button"
import { useAppAuth } from "@/features/auth/app-auth-context"
import {
  createPricingCatalogQueryOptions,
  createPricingPageQueryOptions,
} from "@/features/pricing/infrastructure/pricing.queries"
import { createPaddleCheckoutContext } from "@/lib/server/create-paddle-checkout-context"

export const Route = createFileRoute("/pricing")({
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(
      createPricingCatalogQueryOptions()
    )
  },
  component: PricingPage,
})

const sharedFeatures = [
  "4K UPSCALING",
  "FULL SUITE OF ADVANCED AI EDITING TOOLS",
  "COMMERCIAL LICENSE",
] as const

type PaidPlanCode = "MONTHLY" | "ANNUAL"

function readClientPaddleEnvironment(): "sandbox" | "production" {
  const rawEnvironment = (import.meta.env.VITE_PADDLE_ENV ?? "sandbox")
    .toString()
    .trim()
    .toLowerCase()

  return rawEnvironment === "production" ? "production" : "sandbox"
}

function readClientPriceId(planCode: PaidPlanCode): string | null {
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

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function PricingPage() {
  const { data: pricing } = useSuspenseQuery(createPricingPageQueryOptions())
  const auth = useAppAuth()
  const createPaddleCheckoutContextServerFn = useServerFn(
    createPaddleCheckoutContext
  )
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingPlanCode, setPendingPlanCode] = useState<PaidPlanCode | null>(
    null
  )

  const singleFullEditCredits =
    pricing.operationCosts.normalImage +
    pricing.operationCosts.styleApplied +
    pricing.operationCosts.upscale4k

  useEffect(() => {
    const clientToken =
      typeof import.meta.env.VITE_PADDLE_CLIENT_TOKEN === "string"
        ? import.meta.env.VITE_PADDLE_CLIENT_TOKEN.trim()
        : ""

    if (!clientToken) {
      setCheckoutError("Billing checkout is not configured yet.")
      return
    }

    let canceled = false

    void import("@paddle/paddle-js")
      .then(async ({ initializePaddle }) => {
        const initialized = await initializePaddle({
          environment: readClientPaddleEnvironment(),
          token: clientToken,
        })

        if (canceled) {
          return
        }

        if (!initialized) {
          setCheckoutError("Unable to initialize Paddle checkout.")
          return
        }

        setPaddle(initialized)
        setCheckoutError(null)
      })
      .catch(() => {
        if (!canceled) {
          setCheckoutError("Unable to load Paddle checkout.")
        }
      })

    return () => {
      canceled = true
    }
  }, [])

  const openPaidPlanCheckout = useCallback(
    async (planCode: PaidPlanCode) => {
      setCheckoutError(null)

      if (!auth.accessToken) {
        auth.openLoginDialog()
        return
      }

      if (!paddle) {
        setCheckoutError("Billing checkout is still loading. Please retry.")
        return
      }

      const priceId = readClientPriceId(planCode)
      if (!priceId) {
        setCheckoutError("Billing plan is not configured.")
        return
      }

      setPendingPlanCode(planCode)

      try {
        const checkoutContext = await createPaddleCheckoutContextServerFn({
          data: {
            accessToken: auth.accessToken,
          },
        })

        paddle.Checkout.open({
          items: [
            {
              priceId,
              quantity: 1,
            },
          ],
          customer: checkoutContext.email
            ? {
                email: checkoutContext.email,
              }
            : undefined,
          customData: {
            profileId: checkoutContext.profileId,
            signedAt: checkoutContext.signedAt,
            signature: checkoutContext.signature,
          },
          settings: {
            displayMode: "overlay",
            theme: "light",
            successUrl: `${window.location.origin}/pricing?checkout=success`,
          },
        })
      } catch (error) {
        setCheckoutError(
          error instanceof Error ? error.message : "Failed to open checkout."
        )
      } finally {
        setPendingPlanCode(null)
      }
    },
    [auth, createPaddleCheckoutContextServerFn, paddle]
  )

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-[#f9f9f9] text-[#1a1c1c]">
      <main className="mx-auto max-w-7xl px-6 pt-8 pb-12">
        <section className="mb-8 text-center md:text-left">
          <div className="mb-4 inline-block bg-[#a70070] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-white uppercase">
            Pricing Models
          </div>

          <p className="max-w-2xl text-lg leading-relaxed text-stone-600">
            Precision editing requires precision tools. Select a plan that
            matches your production throughput. No hidden fees, just raw
            creative output.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-0 border-t border-l border-black/10 md:grid-cols-12">
          <article className="flex flex-col border-r border-b border-black/10 bg-stone-100 p-8 transition-colors hover:bg-stone-200 md:col-span-4">
            <div className="mb-4 h-32">
              <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight uppercase">
                {pricing.freePlan.label}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl font-black">
                  {formatUsd(pricing.freePlan.priceCents)}
                </span>
                <span className="text-sm text-stone-600">/MONTH</span>
              </div>
            </div>

            <div className="grow">
              <div className="mb-2 flex h-16 items-start gap-3">
                <Coins size={18} className="mt-0.5 text-[#a70070]" />
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide uppercase">
                    {pricing.freePlan.monthlyCredits} CREDITS / MONTH
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.15em] text-stone-600 uppercase">
                    REFRESHES EVERY 30 DAYS
                  </p>
                </div>
              </div>

              <ul className="mb-16 space-y-4">
                {sharedFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 font-mono text-sm font-medium"
                  >
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-auto rounded-none border-2 border-black py-4 font-mono text-xs font-bold tracking-[0.2em] uppercase transition-colors hover:bg-black hover:text-white"
            >
              START CREATING
            </Button>
          </article>

          <article className="relative flex flex-col border-r border-b border-black/10 bg-white p-8 transition-colors hover:bg-stone-100 md:col-span-4">
            <div className="absolute top-0 right-0 bg-[#a70070] px-4 py-1 font-mono text-[10px] font-black tracking-tight text-white uppercase">
              MOST POPULAR
            </div>

            <div className="mb-4 h-32">
              <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight uppercase">
                {pricing.monthlyPlan.label}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl font-black text-[#a70070]">
                  {formatUsd(pricing.monthlyPlan.priceCents)}
                </span>
                <span className="text-sm text-stone-600">/MONTH</span>
              </div>
            </div>

            <div className="grow">
              <div className="mb-2 flex h-16 items-start gap-3">
                <Coins
                  size={18}
                  className="mt-0.5 fill-[#a70070] text-[#a70070]"
                />
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide uppercase">
                    {pricing.monthlyPlan.monthlyCredits} CREDITS / MONTH
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.15em] text-stone-600 uppercase">
                    REFRESHES EVERY 30 DAYS
                  </p>
                </div>
              </div>

              <ul className="mb-16 space-y-4">
                {sharedFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 font-mono text-sm font-medium"
                  >
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              type="button"
              onClick={() => {
                void openPaidPlanCheckout("MONTHLY")
              }}
              disabled={!paddle || pendingPlanCode !== null}
              className="h-auto rounded-none bg-linear-to-br from-[#a70070] to-[#d3008e] py-4 font-mono text-xs font-bold tracking-[0.2em] text-white uppercase transition-colors hover:from-[#8e005f] hover:to-[#b6007a]"
            >
              {pendingPlanCode === "MONTHLY"
                ? "OPENING CHECKOUT..."
                : "CHOOSE MONTHLY PLAN"}
            </Button>
          </article>

          <article className="relative flex flex-col border-r border-b border-black bg-[#1a1c1c] p-8 text-white transition-colors hover:bg-[#2a2c2c] md:col-span-4">
            <div className="absolute -top-4 left-8 border border-black bg-[#a3f876] px-3 py-1 font-mono text-xs font-black tracking-[0.2em] text-[#082100] uppercase">
              BEST SAVINGS
            </div>

            <div className="mb-4 h-32">
              <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight text-[#ffd8e7] uppercase">
                {pricing.annualPlan.label}
              </h2>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-5xl font-black">
                    {formatUsd(pricing.annualPlan.priceCents)}
                  </span>
                  <span className="text-sm text-white/60">/YEAR</span>
                </div>
                <span className="mt-1 font-mono text-xs font-bold tracking-wider text-[#a3f876] uppercase">
                  ONLY ~{formatUsd(pricing.annualEquivalentMonthlyPriceCents)} /
                  MONTH
                </span>
              </div>
            </div>

            <div className="grow">
              <div className="mb-2 flex h-16 items-start gap-3">
                <Coins
                  size={18}
                  className="mt-0.5 fill-[#ffd8e7] text-[#ffd8e7]"
                />
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide uppercase">
                    {pricing.annualPlan.monthlyCredits} CREDITS / MONTH
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.15em] text-white/60 uppercase">
                    REFRESHES EVERY 30 DAYS
                  </p>
                </div>
              </div>

              <ul className="mb-8 space-y-4">
                {sharedFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 font-mono text-sm font-medium"
                  >
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              type="button"
              onClick={() => {
                void openPaidPlanCheckout("ANNUAL")
              }}
              disabled={!paddle || pendingPlanCode !== null}
              className="h-auto rounded-none bg-white py-4 font-mono text-xs font-bold tracking-[0.2em] text-black uppercase hover:bg-[#ffd8e7]"
            >
              {pendingPlanCode === "ANNUAL"
                ? "OPENING CHECKOUT..."
                : "CHOOSE ANNUAL PLAN"}
            </Button>
          </article>
        </section>

        {checkoutError ? (
          <p className="mt-4 font-mono text-xs font-bold tracking-wide text-red-700 uppercase">
            {checkoutError}
          </p>
        ) : null}

        <section className="mt-20">
          <div className="border-4 border-black p-8 md:p-16">
            <h3 className="mb-12 text-center font-heading text-4xl leading-none font-extrabold tracking-tighter uppercase md:text-left md:text-6xl">
              HOW CREDITS WORK
            </h3>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    1 NORMAL IMAGE
                  </span>
                  <span className="font-heading text-xl font-black text-[#a70070]">
                    {pricing.operationCosts.normalImage} CREDITS
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    1 4K UPSCALE
                  </span>
                  <span className="font-heading text-xl font-black text-[#a70070]">
                    {pricing.operationCosts.upscale4k} CREDITS
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    1 STYLE APPLIED
                  </span>
                  <span className="font-heading text-xl font-black text-[#a70070]">
                    {pricing.operationCosts.styleApplied} CREDIT
                    {pricing.operationCosts.styleApplied === 1 ? "" : "S"}
                  </span>
                </div>
              </div>

              <div className="border border-black/10 bg-stone-200 p-8">
                <div className="mb-8">
                  <p className="mb-2 font-mono text-[10px] font-black tracking-[0.2em] text-stone-600 uppercase">
                    Example Calculation
                  </p>
                  <p className="font-mono text-lg leading-tight font-bold uppercase">
                    GENERATE 1 NORMAL IMAGE + 1 STYLE + 4K UPSCALE ={" "}
                    <span className="text-[#a70070]">
                      {singleFullEditCredits} CREDITS TOTAL
                    </span>
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] font-black tracking-[0.2em] text-stone-600 uppercase">
                    Note on Quantity
                  </p>
                  <p className="font-mono text-lg leading-tight font-bold uppercase">
                    GENERATE 2 IMAGES WITH THE SAME SETTINGS ={" "}
                    <span className="text-[#a70070]">
                      {singleFullEditCredits * 2} CREDITS
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
