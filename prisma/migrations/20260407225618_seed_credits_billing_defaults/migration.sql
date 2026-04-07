-- Add guard-rail checks for non-negative balances and credit values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credit_accounts_balance_non_negative'
  ) THEN
    ALTER TABLE "credit_accounts"
      ADD CONSTRAINT "credit_accounts_balance_non_negative"
      CHECK ("balance" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credit_transactions_amount_positive'
  ) THEN
    ALTER TABLE "credit_transactions"
      ADD CONSTRAINT "credit_transactions_amount_positive"
      CHECK ("amount" > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credit_transactions_balance_after_non_negative'
  ) THEN
    ALTER TABLE "credit_transactions"
      ADD CONSTRAINT "credit_transactions_balance_after_non_negative"
      CHECK ("balance_after" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'billing_plans_monthly_credits_non_negative'
  ) THEN
    ALTER TABLE "billing_plans"
      ADD CONSTRAINT "billing_plans_monthly_credits_non_negative"
      CHECK ("monthly_credits" >= 0);
  END IF;
END $$;

INSERT INTO "credit_pricing_rules" (
  "code",
  "credits_per_unit",
  "is_active",
  "updated_at"
)
VALUES
  ('NORMAL_IMAGE', 3, true, CURRENT_TIMESTAMP),
  ('UPSCALE_4K', 2, true, CURRENT_TIMESTAMP),
  ('STYLE_APPLIED', 1, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "credits_per_unit" = EXCLUDED."credits_per_unit",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "billing_plans" (
  "code",
  "name",
  "price_cents",
  "currency",
  "interval",
  "monthly_credits",
  "is_active",
  "updated_at"
)
VALUES
  ('FREE', 'Free', 0, 'USD', 'MONTHLY', 10, true, CURRENT_TIMESTAMP),
  ('MONTHLY', 'Monthly', 449, 'USD', 'MONTHLY', 50, true, CURRENT_TIMESTAMP),
  ('ANNUAL', 'Annual', 1999, 'USD', 'YEARLY', 1000, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "price_cents" = EXCLUDED."price_cents",
  "currency" = EXCLUDED."currency",
  "interval" = EXCLUDED."interval",
  "monthly_credits" = EXCLUDED."monthly_credits",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "credit_accounts" (
  "profile_id",
  "balance",
  "updated_at"
)
SELECT
  p."id",
  10,
  CURRENT_TIMESTAMP
FROM "profiles" p
ON CONFLICT ("profile_id") DO UPDATE SET
  "balance" = GREATEST("credit_accounts"."balance", 10),
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "billing_subscriptions" (
  "profile_id",
  "plan_id",
  "status",
  "current_period_start",
  "updated_at"
)
SELECT
  p."id",
  bp."id",
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "profiles" p
INNER JOIN "billing_plans" bp
  ON bp."code" = 'FREE'
WHERE NOT EXISTS (
  SELECT 1
  FROM "billing_subscriptions" bs
  WHERE bs."profile_id" = p."id"
    AND bs."status" = 'ACTIVE'
);
