/*
  Warnings:

  - You are about to drop the `billing_payment_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `credit_pricing_rules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "billing_payment_events" DROP CONSTRAINT "billing_payment_events_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "billing_payment_events" DROP CONSTRAINT "billing_payment_events_subscription_id_fkey";

-- DropTable
DROP TABLE "billing_payment_events";

-- DropTable
DROP TABLE "credit_pricing_rules";

-- DropEnum
DROP TYPE "BillingPaymentEventStatus";
