# Batch 10A and 10B Supabase MCP Verification Status

**Updated:** 9 September 2026 (Asia/Bangkok)  
**Project:** `puslxgriozubqlpoxrqo`  
**Result:** ✅ Applied and verified

## Batch 10A — Verified Reviews

- Rollback-only migration verification: PASS
- Applied migration: `verified_order_reviews`
- Remote version: `20260909160757`
- Tables: `order_reviews`, `customer_discount_credits`
- RLS: enabled
- Client roles cannot execute server-side review functions
- Synthetic data: rolled back; none remains

## Batch 10B — Apply Review Credit to Orders

- Local file: `supabase/migrations/20260909161121_apply_review_credit_to_orders.sql`
- Rollback-only syntax and functional verification: PASS
- Applied migration: `apply_review_credit_to_orders`
- Remote version: `20260909161908`
- Post-apply reserve/release smoke test: PASS and rolled back

Verified lifecycle:

1. One available credit is reserved automatically for the next order.
2. The ฿5 discount is included in the authoritative database total.
3. Cancelling an unpaid order returns the credit to available.
4. Confirming the order redeems the credit.
5. Concurrent/double use is guarded by row locks and unique indexes.
6. `PUBLIC`, `anon`, and `authenticated` cannot execute credit functions; `service_role` can.

## Application Verification

- `npm run test:review-credit`: PASS
- `npm run test:review-system`: PASS
- `npm run test:line-copy`: PASS
- `npm run test:payment-guards`: PASS
- `npm run test:shipping-policy`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

## Advisor Notes

- RLS-without-policy notices are expected for server-only tables.
- Existing leaked-password-protection warning remains unrelated to these batches.
- Unused-index notices are informational for newly deployed indexes.

## Current State

Database work, application deployment, and browser verification are complete.

- Production deployment: `dpl_2yrrGbqDfvSETuCQnRHJqMcjsRdL`
- Production alias: `https://www.pod4u.store`
- Verified routes: `/reviews`, `/member`, `/admin/reviews`, `/admin/orders`
- Browser checks were read-only and did not alter real orders or stock.

## Full E2E Result — 10 September 2026

- Review submission: PASS
- Duplicate submission idempotency: PASS
- Admin approval and ฿5 issuance: PASS
- Duplicate approval idempotency: PASS
- Automatic credit reservation on next order: PASS
- Final total calculation (฿100 → ฿95): PASS
- Cancellation and credit release: PASS
- Reuse and redemption on confirmed order: PASS
- Approved-review publication state: PASS
- Transaction rollback cleanup: PASS
- Remaining synthetic customers/orders/reviews/credits: `0 / 0 / 0 / 0`
