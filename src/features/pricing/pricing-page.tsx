import { Check, Coins } from "lucide-react"

import { AppFooter } from "@/components/app-footer"
import { Button } from "@/components/ui/button"
import { formatUsd } from "@/features/pricing/domain/pricing.helpers"
import type { PricingPageModel } from "@/features/pricing/domain/pricing.selectors"
import type { PricingCheckoutController } from "@/features/pricing/use-pricing-checkout"

const sharedFeatures = [
  "4K UPSCALING",
  "FULL SUITE OF ADVANCED AI EDITING TOOLS",
  "COMMERCIAL LICENSE",
] as const

type PricingPageProps = {
  controller: PricingCheckoutController
  pricing: PricingPageModel
}

export function PricingPage({ controller, pricing }: PricingPageProps) {
  const singleFullEditCredits =
    pricing.operationCosts.normalImage +
    pricing.operationCosts.styleApplied +
    pricing.operationCosts.upscale4k

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-6 pt-8 pb-12">
        <section className="mb-8 text-center md:text-left">
          <div className="mb-4 inline-block bg-primary px-3 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-primary-foreground uppercase">
            Pricing Models
          </div>

          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Precision editing requires precision tools. Select a plan that
            matches your production throughput. No hidden fees, just raw
            creative output.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-0 border-t border-l border-border/70 md:grid-cols-12">
          <article className="flex flex-col border-r border-b border-border/70 bg-muted/40 p-8 transition-colors hover:bg-muted/70 md:col-span-4">
            <div className="mb-4 h-32">
              <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight uppercase">
                {pricing.freePlan.label}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl font-black">
                  {formatUsd(pricing.freePlan.priceCents)}
                </span>
                <span className="text-sm text-muted-foreground">/MONTH</span>
              </div>
            </div>

            <div className="grow">
              <div className="mb-2 flex h-16 items-start gap-3">
                <Coins size={18} className="mt-0.5 text-primary" />
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide uppercase">
                    {pricing.freePlan.monthlyCredits} CREDITS / MONTH
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
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
              disabled={controller.freePlanButton.disabled}
              className="h-auto rounded-none border-2 border-foreground py-4 font-mono text-xs font-bold tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {controller.freePlanButton.label}
            </Button>
          </article>

          <article className="relative flex flex-col border-r border-b border-border/70 bg-card p-8 transition-colors hover:bg-muted/40 md:col-span-4">
            <div className="absolute top-0 right-0 bg-primary px-4 py-1 font-mono text-[10px] font-black tracking-tight text-primary-foreground uppercase">
              MOST POPULAR
            </div>

            <div className="mb-4 h-32">
              <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight uppercase">
                {pricing.monthlyPlan.label}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl font-black text-primary">
                  {formatUsd(pricing.monthlyPlan.priceCents)}
                </span>
                <span className="text-sm text-muted-foreground">/MONTH</span>
              </div>
            </div>

            <div className="grow">
              <div className="mb-2 flex h-16 items-start gap-3">
                <Coins size={18} className="mt-0.5 fill-primary text-primary" />
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide uppercase">
                    {pricing.monthlyPlan.monthlyCredits} CREDITS / MONTH
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
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
              onClick={controller.monthlyPlanButton.onChoose}
              disabled={controller.monthlyPlanButton.disabled}
              className="h-auto rounded-none bg-linear-to-br from-primary to-accent py-4 font-mono text-xs font-bold tracking-[0.2em] text-primary-foreground uppercase transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {controller.monthlyPlanButton.label}
            </Button>
          </article>

          <article className="relative flex flex-col border-r border-b border-border bg-secondary/80 p-8 text-secondary-foreground transition-colors hover:bg-secondary md:col-span-4">
            <div className="absolute -top-4 left-8 border border-border bg-accent px-3 py-1 font-mono text-xs font-black tracking-[0.2em] text-accent-foreground uppercase">
              BEST SAVINGS
            </div>

            <div className="mb-4 h-32">
              <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight text-primary uppercase">
                {pricing.annualPlan.label}
              </h2>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-5xl font-black">
                    {formatUsd(pricing.annualPlan.priceCents)}
                  </span>
                  <span className="text-sm text-muted-foreground">/YEAR</span>
                </div>
                <span className="mt-1 font-mono text-xs font-bold tracking-wider text-primary uppercase">
                  ONLY ~{formatUsd(pricing.annualEquivalentMonthlyPriceCents)} /
                  MONTH
                </span>
              </div>
            </div>

            <div className="grow">
              <div className="mb-2 flex h-16 items-start gap-3">
                <Coins size={18} className="mt-0.5 fill-primary text-primary" />
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide uppercase">
                    {pricing.annualPlan.monthlyCredits} CREDITS / MONTH
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
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
              onClick={controller.annualPlanButton.onChoose}
              disabled={controller.annualPlanButton.disabled}
              className="h-auto rounded-none bg-background py-4 font-mono text-xs font-bold tracking-[0.2em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
            >
              {controller.annualPlanButton.label}
            </Button>
          </article>
        </section>

        {controller.checkoutError ? (
          <p className="mt-4 font-mono text-xs font-bold tracking-wide text-destructive uppercase">
            {controller.checkoutError}
          </p>
        ) : null}

        <section className="mt-20">
          <div className="border-4 border-border p-8 md:p-16">
            <h3 className="mb-12 text-center font-heading text-4xl leading-none font-extrabold tracking-tighter uppercase md:text-left md:text-6xl">
              HOW CREDITS WORK
            </h3>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-border/60 pb-4">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    1 NORMAL IMAGE
                  </span>
                  <span className="font-heading text-xl font-black text-primary">
                    {pricing.operationCosts.normalImage} CREDITS
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-2 border-border/60 pb-4">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    1 4K UPSCALE
                  </span>
                  <span className="font-heading text-xl font-black text-primary">
                    {pricing.operationCosts.upscale4k} CREDITS
                  </span>
                </div>
                <div className="flex items-center justify-between border-b-2 border-border/60 pb-4">
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    1 STYLE APPLIED
                  </span>
                  <span className="font-heading text-xl font-black text-primary">
                    {pricing.operationCosts.styleApplied} CREDIT
                    {pricing.operationCosts.styleApplied === 1 ? "" : "S"}
                  </span>
                </div>
              </div>

              <div className="border border-border/70 bg-muted/60 p-8">
                <div className="mb-8">
                  <p className="mb-2 font-mono text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                    Example Calculation
                  </p>
                  <p className="font-mono text-lg leading-tight font-bold uppercase">
                    GENERATE 1 NORMAL IMAGE + 1 STYLE + 4K UPSCALE ={" "}
                    <span className="text-primary">
                      {singleFullEditCredits} CREDITS TOTAL
                    </span>
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
                    Note on Quantity
                  </p>
                  <p className="font-mono text-lg leading-tight font-bold uppercase">
                    GENERATE 2 IMAGES WITH THE SAME SETTINGS ={" "}
                    <span className="text-primary">
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
