# Database ERD

Source of truth: `prisma/schema.prisma` (note: `src/lib/server/prisma.ts` only initializes the Prisma client).

## Mermaid ERD

```mermaid
erDiagram
  profiles {
    UUID id PK
    TEXT email "UNIQUE, nullable"
    TEXT display_name "nullable"
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  credit_accounts {
    UUID id PK
    UUID profile_id FK "UNIQUE"
    INT balance
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  credit_transactions {
    UUID id PK
    UUID credit_account_id FK
    ENUM direction
    INT amount
    INT balance_after
    TEXT reason
    ENUM operation_code "nullable"
    JSON metadata "nullable"
    TIMESTAMP created_at
  }

  credit_pricing_rules {
    ENUM code PK
    INT credits_per_unit
    BOOL is_active
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  billing_plans {
    UUID id PK
    ENUM code "UNIQUE"
    TEXT name
    INT price_cents
    TEXT currency
    ENUM interval
    INT monthly_credits
    BOOL is_active
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  billing_subscriptions {
    UUID id PK
    UUID profile_id FK
    UUID plan_id FK
    ENUM status
    TIMESTAMP current_period_start
    TIMESTAMP current_period_end "nullable"
    BOOL cancel_at_period_end
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  billing_payment_events {
    UUID id PK
    UUID profile_id FK "nullable"
    UUID subscription_id FK "nullable"
    TEXT provider
    TEXT provider_event_id
    TEXT event_type
    ENUM status
    JSON payload "nullable"
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  profiles ||--o| credit_accounts : "has one (optional)"
  credit_accounts ||--o{ credit_transactions : "has many"

  profiles ||--o{ billing_subscriptions : "has many"
  billing_plans ||--o{ billing_subscriptions : "has many"

  profiles o|--o{ billing_payment_events : "has many (optional FK)"
  billing_subscriptions o|--o{ billing_payment_events : "has many (optional FK)"
```

## Relationship Summary

1. `credit_accounts.profile_id -> profiles.id`  
   Cardinality: one `Profile` to zero/one `CreditAccount` (`profile_id` is unique).  
   On delete: `CASCADE`.
2. `credit_transactions.credit_account_id -> credit_accounts.id`  
   Cardinality: one `CreditAccount` to many `CreditTransaction`.  
   On delete: `CASCADE`.
3. `billing_subscriptions.profile_id -> profiles.id`  
   Cardinality: one `Profile` to many `BillingSubscription`.  
   On delete: `CASCADE`.
4. `billing_subscriptions.plan_id -> billing_plans.id`  
   Cardinality: one `BillingPlan` to many `BillingSubscription`.  
   On delete: `RESTRICT`.
5. `billing_payment_events.profile_id -> profiles.id` (nullable)  
   Cardinality: one `Profile` to many `BillingPaymentEvent` (optional link from event side).  
   On delete: `SET NULL`.
6. `billing_payment_events.subscription_id -> billing_subscriptions.id` (nullable)  
   Cardinality: one `BillingSubscription` to many `BillingPaymentEvent` (optional link from event side).  
   On delete: `SET NULL`.

## Notes

- `credit_transactions.operation_code` references the `CreditPricingRuleCode` enum (not a FK table relation).
- `billing_payment_events` has a composite unique constraint on `(provider, provider_event_id)`.
