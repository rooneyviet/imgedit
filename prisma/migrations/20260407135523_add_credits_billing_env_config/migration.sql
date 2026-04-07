-- CreateEnum
CREATE TYPE "CreditPricingRuleCode" AS ENUM ('NORMAL_IMAGE', 'UPSCALE_4K', 'STYLE_APPLIED');

-- CreateEnum
CREATE TYPE "CreditTransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "BillingPlanCode" AS ENUM ('FREE', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingPlanInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');

-- CreateEnum
CREATE TYPE "BillingPaymentEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "credit_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credit_account_id" UUID NOT NULL,
    "direction" "CreditTransactionDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "operation_code" "CreditPricingRuleCode",
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_pricing_rules" (
    "code" "CreditPricingRuleCode" NOT NULL,
    "credits_per_unit" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_pricing_rules_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "billing_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "BillingPlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "BillingPlanInterval" NOT NULL,
    "monthly_credits" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "subscription_id" UUID,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "BillingPaymentEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_accounts_profile_id_key" ON "credit_accounts"("profile_id");

-- CreateIndex
CREATE INDEX "credit_accounts_profile_id_idx" ON "credit_accounts"("profile_id");

-- CreateIndex
CREATE INDEX "credit_transactions_credit_account_id_created_at_idx" ON "credit_transactions"("credit_account_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_transactions_operation_code_idx" ON "credit_transactions"("operation_code");

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_code_key" ON "billing_plans"("code");

-- CreateIndex
CREATE INDEX "billing_subscriptions_profile_id_status_idx" ON "billing_subscriptions"("profile_id", "status");

-- CreateIndex
CREATE INDEX "billing_subscriptions_plan_id_idx" ON "billing_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "billing_payment_events_profile_id_idx" ON "billing_payment_events"("profile_id");

-- CreateIndex
CREATE INDEX "billing_payment_events_subscription_id_idx" ON "billing_payment_events"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_events_provider_provider_event_id_key" ON "billing_payment_events"("provider", "provider_event_id");

-- AddForeignKey
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "credit_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_events" ADD CONSTRAINT "billing_payment_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_events" ADD CONSTRAINT "billing_payment_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
