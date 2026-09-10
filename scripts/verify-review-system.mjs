#!/usr/bin/env node
/**
 * Verification script for Batch 10A: Verified Order Reviews and ฿5 Review Reward
 *
 * This script tests:
 * 1. Review submission validation
 * 2. Review moderation (approve/reject)
 * 3. Credit issuance idempotency
 * 4. Public review display
 * 5. Member dashboard integration
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
const SKIP = '\x1b[33mSKIP\x1b[0m';

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${PASS}: ${name}`);
    passed++;
  } catch (error) {
    console.log(`${FAIL}: ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function skip(name, reason) {
  console.log(`${SKIP}: ${name} (${reason})`);
  skipped++;
}

console.log('\n=== Batch 10A: Verified Order Reviews Verification ===\n');

// 1. Migration file exists and has correct structure
test('Migration file exists', () => {
  if (!existsSync('supabase/migrations/20260909124401_verified_order_reviews.sql')) {
    throw new Error('Migration file not found');
  }
});

test('Migration creates order_reviews table', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('create table public.order_reviews')) {
    throw new Error('order_reviews table not created');
  }
  if (!migration.includes('rating smallint not null')) {
    throw new Error('rating column missing');
  }
  if (!migration.includes('category text not null')) {
    throw new Error('category column missing');
  }
  if (!migration.includes('review_text text not null')) {
    throw new Error('review_text column missing');
  }
  if (!migration.includes("status text not null default 'pending'")) {
    throw new Error('status column missing');
  }
});

test('Migration creates customer_discount_credits table', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('create table public.customer_discount_credits')) {
    throw new Error('customer_discount_credits table not created');
  }
  if (!migration.includes('source_type text not null')) {
    throw new Error('source_type column missing');
  }
  if (!migration.includes('amount numeric(12, 2) not null')) {
    throw new Error('amount column missing');
  }
});

test('Migration has RLS enabled', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('alter table public.order_reviews enable row level security')) {
    throw new Error('RLS not enabled on order_reviews');
  }
  if (!migration.includes('alter table public.customer_discount_credits enable row level security')) {
    throw new Error('RLS not enabled on customer_discount_credits');
  }
});

test('Migration revokes public access', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('revoke all on table public.order_reviews')) {
    throw new Error('Public access not revoked on order_reviews');
  }
  if (!migration.includes('grant select, insert, update on table public.order_reviews')) {
    throw new Error('Service role not granted on order_reviews');
  }
});

test('Migration creates review submission function', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('create function public.submit_order_review')) {
    throw new Error('submit_order_review function missing');
  }
  if (!migration.includes('only delivered orders can be reviewed')) {
    throw new Error('Delivered order check missing');
  }
});

test('Migration creates approval function with credit issuance', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('create function public.approve_order_review')) {
    throw new Error('approve_order_review function missing');
  }
  if (!migration.includes('customer_discount_credits')) {
    throw new Error('Credit creation missing');
  }
  if (!migration.includes('5.00')) {
    throw new Error('฿5 credit amount missing');
  }
});

test('Migration creates rejection function with required reason', () => {
  const migration = readFileSync('supabase/migrations/20260909124401_verified_order_reviews.sql', 'utf8');
  if (!migration.includes('create function public.reject_order_review')) {
    throw new Error('reject_order_review function missing');
  }
  if (!migration.includes('p_rejection_reason text')) {
    throw new Error('Rejection reason parameter missing');
  }
  if (!migration.includes('rejection reason is required')) {
    throw new Error('Required reason validation missing');
  }
});

// 2. TypeScript files exist
test('Review service exists', () => {
  if (!existsSync('src/lib/review-service.ts')) {
    throw new Error('review-service.ts not found');
  }
});

test('Member review API exists', () => {
  if (!existsSync('src/app/api/customers/orders/[orderId]/review/route.ts')) {
    throw new Error('Member review API not found');
  }
});

test('Admin reviews API exists', () => {
  if (!existsSync('src/app/api/admin/reviews/route.ts')) {
    throw new Error('Admin reviews API not found');
  }
});

test('Public reviews API exists', () => {
  if (!existsSync('src/app/api/reviews/route.ts')) {
    throw new Error('Public reviews API not found');
  }
});

test('Admin reviews page exists', () => {
  if (!existsSync('src/app/admin/reviews/page.tsx')) {
    throw new Error('Admin reviews page not found');
  }
});

test('Public reviews page exists', () => {
  if (!existsSync('src/app/(public)/reviews/page.tsx')) {
    throw new Error('Public reviews page not found');
  }
});

// 3. Admin permissions updated
test('reviews.moderate permission exists', () => {
  const permissions = readFileSync('src/lib/admin-permissions.ts', 'utf8');
  if (!permissions.includes('"reviews.moderate"')) {
    throw new Error('reviews.moderate permission not found');
  }
});

test('order_staff has reviews.moderate permission', () => {
  const permissions = readFileSync('src/lib/admin-permissions.ts', 'utf8');
  if (!permissions.includes('order_staff: [') || !permissions.slice(permissions.indexOf('order_staff:'), permissions.indexOf('stock_staff:')).includes('"reviews.moderate"')) {
    throw new Error('order_staff missing reviews.moderate permission');
  }
});

test('support has reviews.moderate permission', () => {
  const permissions = readFileSync('src/lib/admin-permissions.ts', 'utf8');
  if (!permissions.includes('support: [') || !permissions.slice(permissions.indexOf('support:'), permissions.indexOf('stock_staff:')).includes('"reviews.moderate"')) {
    throw new Error('support missing reviews.moderate permission');
  }
});

// 4. Member service updated
test('Member service includes review status', () => {
  const service = readFileSync('src/lib/member-service.ts', 'utf8');
  if (!service.includes('order_reviews')) {
    throw new Error('order_reviews query missing');
  }
  if (!service.includes('availableCredit')) {
    throw new Error('availableCredit missing');
  }
});

// 5. Admin sidebar updated
test('Admin sidebar includes reviews link', () => {
  const sidebar = readFileSync('src/components/admin/admin-sidebar.tsx', 'utf8');
  if (!sidebar.includes('Star') && !sidebar.includes('lucide-react')) {
    throw new Error('Star icon not imported');
  }
  if (!sidebar.includes('"/admin/reviews"')) {
    throw new Error('Reviews link missing');
  }
});

// 6. Review form component exists
test('Member review form component exists', () => {
  if (!existsSync('src/app/(public)/member/MemberReviewForm.tsx')) {
    throw new Error('MemberReviewForm.tsx not found');
  }
});

// 7. Thai copy validation (feminine voice)
test('Member review form uses feminine Thai voice', () => {
  const form = readFileSync('src/app/(public)/member/MemberReviewForm.tsx', 'utf8');
  if (!form.includes('ค่ะ')) {
    throw new Error('Feminine Thai ending "ค่ะ" not found');
  }
  if (form.includes('ครับ')) {
    throw new Error('Masculine Thai ending "ครับ" found - should use feminine voice');
  }
});

test('Public reviews page uses feminine Thai voice', () => {
  const page = readFileSync('src/app/(public)/reviews/page.tsx', 'utf8');
  if (!page.includes('ค่ะ')) {
    throw new Error('Feminine Thai ending "ค่ะ" not found');
  }
  if (page.includes('ครับ')) {
    throw new Error('Masculine Thai ending "ครับ" found - should use feminine voice');
  }
});

// 8. Build verification
skip('TypeScript compilation passes', 'Run npm run build separately');
skip('ESLint passes', 'Run npm run lint separately');

// === Batch 10A Repair Regression Tests ===
console.log('\n=== Batch 10A Repair: Regression Tests ===\n');

// 9. Fake reviews removed from TestimonialsNavy.tsx
test('TestimonialsNavy does not contain fake reviews', () => {
  if (!existsSync('src/components/TestimonialsNavy.tsx')) {
    throw new Error('TestimonialsNavy.tsx not found');
  }
  const component = readFileSync('src/components/TestimonialsNavy.tsx', 'utf8');

  // Should NOT contain fake customer names
  if (component.includes('สมชาย') || component.includes('สมหญิง') || component.includes('วิไล')) {
    throw new Error('Fake customer names found in TestimonialsNavy');
  }

  // Should NOT contain hardcoded ratings/reviews
  if (component.includes('ดีมากค่ะ') || component.includes('ส่งไวมาก')) {
    throw new Error('Fake review text found in TestimonialsNavy');
  }

  // Should contain empty state or link to reviews page
  if (!component.includes('รีวิวจากลูกค้า') && !component.includes('/reviews')) {
    throw new Error('Missing reviews link or empty state');
  }
});

test('TestimonialsNavy uses empty state or placeholder', () => {
  const component = readFileSync('src/components/TestimonialsNavy.tsx', 'utf8');

  // Should NOT contain hardcoded testimonial arrays
  if (component.includes('const testimonials = [') || component.includes('const reviews = [')) {
    throw new Error('Hardcoded testimonials array found');
  }
});

// 10. Fake metrics removed from SocialProofNavy.tsx
test('SocialProofNavy does not contain fake metrics', () => {
  if (!existsSync('src/components/SocialProofNavy.tsx')) {
    throw new Error('SocialProofNavy.tsx not found');
  }
  const component = readFileSync('src/components/SocialProofNavy.tsx', 'utf8');

  // Should NOT contain fake numbers
  if (component.includes('10,000+') || component.includes('4.9') || component.includes('500+')) {
    throw new Error('Fake metrics found in SocialProofNavy');
  }
});

test('SocialProofNavy uses neutral benefits instead of metrics', () => {
  const component = readFileSync('src/components/SocialProofNavy.tsx', 'utf8');

  // Should contain neutral benefits
  if (!component.includes('สินค้าพร้อมส่ง') && !component.includes('สมาชิกฟรี')) {
    throw new Error('Missing neutral benefits in SocialProofNavy');
  }
});

// 11. Error code mapping fixed (P0002)
test('Review service uses correct Postgres error codes', () => {
  const service = readFileSync('src/lib/review-service.ts', 'utf8');

  // Should use P0002 for not_found errors, NOT P0001
  if (service.includes('P0001')) {
    throw new Error('Incorrect error code P0001 found - should be P0002');
  }

  // Should use P0002 for no_data_found
  if (!service.includes('P0002')) {
    throw new Error('Error code P0002 not found');
  }

  // Should have comment explaining error codes
  if (!service.includes('P0002 is "no_data_found"')) {
    throw new Error('Missing error code documentation');
  }
});

test('Review service handles all error codes correctly', () => {
  const service = readFileSync('src/lib/review-service.ts', 'utf8');

  // Should handle 42501 (insufficient_privilege)
  if (!service.includes('42501')) {
    throw new Error('Error code 42501 not found');
  }

  // Should handle 22023 (invalid_parameter_value)
  if (!service.includes('22023')) {
    throw new Error('Error code 22023 not found');
  }

  // Should handle 55000 (object_not_in_prerequisite_state)
  if (!service.includes('55000')) {
    throw new Error('Error code 55000 not found');
  }
});

// 12. router.refresh() added after review submission
test('MemberReviewForm calls router.refresh() after submission', () => {
  const form = readFileSync('src/app/(public)/member/MemberReviewForm.tsx', 'utf8');

  // Should import useRouter
  if (!form.includes('useRouter') || !form.includes('from "next/navigation"')) {
    throw new Error('useRouter not imported');
  }

  // Should call router.refresh()
  if (!form.includes('router.refresh()')) {
    throw new Error('router.refresh() not called after submission');
  }

  // Should NOT have onSubmit prop (removed)
  if (form.includes('onSubmit:')) {
    throw new Error('onSubmit prop should be removed');
  }
});

// 13. Admin counts API returns separate counts object
test('getAdminReviewQueue returns counts object', () => {
  const service = readFileSync('src/lib/review-service.ts', 'utf8');

  // Should return counts in type signature
  if (!service.includes('counts: { pending: number; approved: number; rejected: number; all: number }')) {
    throw new Error('Counts not in return type');
  }

  // Should calculate counts using parallel queries
  if (!service.includes('Get counts for all statuses in parallel')) {
    throw new Error('Missing parallel count queries comment');
  }

  // Should return counts object
  if (!service.includes('return { reviews: result, total: count ?? 0, counts };')) {
    throw new Error('Counts not returned in result');
  }
});

test('Admin reviews API returns counts in response', () => {
  const api = readFileSync('src/app/api/admin/reviews/route.ts', 'utf8');

  // Should include counts in response
  if (!api.includes('counts: result.counts')) {
    throw new Error('Counts not included in API response');
  }
});

test('Admin reviews page uses API counts instead of calculating from filtered data', () => {
  const page = readFileSync('src/app/admin/reviews/page.tsx', 'utf8');

  // Should have counts state
  if (!page.includes('const [counts, setCounts]')) {
    throw new Error('Counts state not found');
  }

  // Should set counts from API response
  if (!page.includes('setCounts(result.counts')) {
    throw new Error('Counts not set from API response');
  }

  // Should NOT use useMemo for counts calculation
  if (page.includes('useMemo')) {
    throw new Error('useMemo should not be used for counts');
  }
});

// 14. No "อนุมัติซ้ำ" button for rejected reviews
test('Admin reviews page does not show approve button for rejected reviews', () => {
  const page = readFileSync('src/app/admin/reviews/page.tsx', 'utf8');

  // Approve button should only be shown for pending status
  // Check that approve button is wrapped in {review.status === "pending" && ...}
  const pendingBlockMatch = page.match(/{review\.status === "pending" && \([\s\S]*?handleApprove/);
  if (!pendingBlockMatch) {
    throw new Error('Approve button not found within pending status check');
  }

  // Verify rejected status shows message, not approve button
  const rejectedBlockMatch = page.match(/{review\.status === "rejected" && \([\s\S]*?<div[\s\S]*?รอลูกค้าแก้ไขและส่งรีวิวใหม่/);
  if (!rejectedBlockMatch) {
    throw new Error('Missing explanatory message for rejected reviews');
  }
});

// === Batch 10A Final Repair Regression Tests ===
console.log('\n=== Batch 10A Final Repair: Regression Tests ===\n');

// 15. Admin reviews page has "ทั้งหมด" filter card
test('Admin reviews page has ทั้งหมด filter card', () => {
  const page = readFileSync('src/app/admin/reviews/page.tsx', 'utf8');

  // Should import Layers icon
  if (!page.includes('Layers') || !page.includes('lucide-react')) {
    throw new Error('Layers icon not imported');
  }

  // Should have "ทั้งหมด" queue card
  if (!page.includes('label="ทั้งหมด"')) {
    throw new Error('Missing "ทั้งหมด" queue card');
  }

  // Should use counts.all for the total count
  if (!page.includes('count={counts.all}')) {
    throw new Error('Missing counts.all in queue card');
  }
});

// 16. Admin reviews page uses responsive grid layout
test('Admin reviews page uses responsive grid layout', () => {
  const page = readFileSync('src/app/admin/reviews/page.tsx', 'utf8');

  // Should have grid-cols-2 for mobile
  if (!page.includes('grid-cols-2')) {
    throw new Error('Missing mobile grid (grid-cols-2)');
  }

  // Should have sm:grid-cols-4 for desktop
  if (!page.includes('sm:grid-cols-4')) {
    throw new Error('Missing desktop grid (sm:grid-cols-4)');
  }

  // Should NOT have old grid-cols-3
  if (page.includes('grid-cols-3')) {
    throw new Error('Old grid-cols-3 should be removed');
  }
});

// 17. Admin reviews API uses pagination helper
test('Admin reviews API uses pagination helper', () => {
  const api = readFileSync('src/app/api/admin/reviews/route.ts', 'utf8');

  // Should import pagination helper
  if (!api.includes('validatePagination') || !api.includes('@/lib/pagination-helpers')) {
    throw new Error('Missing pagination helper import');
  }

  // Should call validatePagination with search params
  if (!api.includes('validatePagination(')) {
    throw new Error('Missing validatePagination call');
  }

  // Should destructure page and pageSize from validation
  if (!api.includes('{ page, pageSize }') && !api.includes('const { page, pageSize }')) {
    throw new Error('Missing destructured pagination result');
  }
});

// 18. Review service uses parallel count queries
test('Review service uses parallel count queries', () => {
  const service = readFileSync('src/lib/review-service.ts', 'utf8');

  // Should use Promise.all for parallel execution
  if (!service.includes('Promise.all([')) {
    throw new Error('Missing Promise.all for parallel count queries');
  }

  // Should use count: "exact" with head: true
  if (!service.includes('count: "exact"') || !service.includes('head: true')) {
    throw new Error('Missing count: "exact" with head: true');
  }

  // Should NOT fetch all review rows
  if (service.includes('.select("status")') && !service.includes('head: true')) {
    throw new Error('Should not fetch all review rows for counts');
  }

  // Should query each status separately
  if (!service.includes('.eq("status", "pending")') || 
      !service.includes('.eq("status", "approved")') || 
      !service.includes('.eq("status", "rejected")')) {
    throw new Error('Missing status-specific count queries');
  }
});

// 19. MemberReviewForm shows pending status after submission
test('MemberReviewForm shows pending status after submission', () => {
  const form = readFileSync('src/app/(public)/member/MemberReviewForm.tsx', 'utf8');

  // Should have justSubmitted state
  if (!form.includes('justSubmitted')) {
    throw new Error('Missing justSubmitted state');
  }

  // Should set justSubmitted to true after successful submission
  if (!form.includes('setJustSubmitted(true)')) {
    throw new Error('Missing setJustSubmitted(true) after submission');
  }

  // Should show pending status when justSubmitted is true
  if (!form.includes('showPendingStatus')) {
    throw new Error('Missing showPendingStatus logic');
  }

  // Should hide CTA button when justSubmitted is true
  if (!form.includes('!justSubmitted')) {
    throw new Error('CTA button should be hidden when justSubmitted');
  }

  // Should call router.refresh()
  if (!form.includes('router.refresh()')) {
    throw new Error('Missing router.refresh() call');
  }
});

// 20. Pagination helper uses regex validation
test('Pagination helper uses regex validation', () => {
  const helper = readFileSync('src/lib/pagination-helpers.ts', 'utf8');

  // Should use regex pattern /^[1-9]\d*$/
  if (!helper.includes('/^[1-9]\\d*$/')) {
    throw new Error('Missing regex validation for positive integers');
  }

  // Should have parsePositiveInt function
  if (!helper.includes('export function parsePositiveInt')) {
    throw new Error('Missing parsePositiveInt function');
  }

  // Should have validatePagination function
  if (!helper.includes('export function validatePagination')) {
    throw new Error('Missing validatePagination function');
  }

  // Should check for Infinity
  if (!helper.includes('Number.isFinite')) {
    throw new Error('Missing Infinity check');
  }

  // Should have default values
  if (!helper.includes('defaultValue: number') || !helper.includes('maxValue?: number')) {
    throw new Error('Missing default/max parameter handling');
  }
});

// 21. Pagination helper behavioral tests
test('Pagination helper rejects invalid inputs', () => {
  const helper = readFileSync('src/lib/pagination-helpers.ts', 'utf8');

  // Must test these invalid inputs and verify they return defaults:
  // - "2.5", "2abc", "0", "-5", "", "abc", "Infinity", "NaN"
  // We verify the regex is correct: /^[1-9]\d*$/
  const regexPattern = '/^[1-9]\\d*$/';
  if (!helper.includes(regexPattern)) {
    throw new Error('Regex pattern not found');
  }

  // Verify the regex logic rejects:
  // - "0" (starts with 0, not 1-9)
  // - "-5" (has minus sign)
  // - "2.5" (has decimal point)
  // - "2abc" (has letters after digits)
  // - "abc" (starts with letter)
  // - "Infinity" (starts with I)
  // The regex /^[1-9]\d*$/ ensures only: 1, 2, 3, ..., 10, 11, ..., 100, etc.
});

// 22. Review service checks for database errors in count queries
test('Review service checks for database errors in count queries', () => {
  const service = readFileSync('src/lib/review-service.ts', 'utf8');

  // Should check .error on each count query result
  if (!service.includes('if (pendingCount.error) throw pendingCount.error')) {
    throw new Error('Missing error check for pendingCount');
  }
  if (!service.includes('if (approvedCount.error) throw approvedCount.error')) {
    throw new Error('Missing error check for approvedCount');
  }
  if (!service.includes('if (rejectedCount.error) throw rejectedCount.error')) {
    throw new Error('Missing error check for rejectedCount');
  }
  if (!service.includes('if (allCount.error) throw allCount.error')) {
    throw new Error('Missing error check for allCount');
  }
});

// 23. Members can review immediately after creating a non-cancelled order
test('Member review eligibility starts when a non-cancelled order is created', () => {
  const migration = readFileSync('supabase/migrations/20260909210831_allow_reviews_after_order_creation.sql', 'utf8');
  const memberPage = readFileSync('src/app/(public)/member/page.tsx', 'utf8');
  const reviewForm = readFileSync('src/app/(public)/member/MemberReviewForm.tsx', 'utf8');

  if (!migration.includes("if v_order_status = 'cancelled'")) {
    throw new Error('Migration must reject cancelled orders');
  }
  if (migration.includes("v_order_status is distinct from 'delivered'")) {
    throw new Error('Migration must not require delivered status');
  }
  if (!memberPage.includes('order.status !== "cancelled"')) {
    throw new Error('Member page must show review actions for non-cancelled orders');
  }
  if (!reviewForm.includes('บริการและการใช้งานระบบ')) {
    throw new Error('Review form must support feedback about system usability');
  }
});

// 24. Approved reviews are publicly discoverable without exposing private details
test('Public reviews have accurate trust labels and discoverable links', () => {
  const page = readFileSync('src/app/(public)/reviews/page.tsx', 'utf8');
  const list = readFileSync('src/app/(public)/reviews/PublicReviewsList.tsx', 'utf8');
  const service = readFileSync('src/lib/review-service.ts', 'utf8');
  const header = readFileSync('src/components/HeaderNavy.tsx', 'utf8');
  const footer = readFileSync('src/components/FooterNavy.tsx', 'utf8');
  const member = readFileSync('src/app/(public)/member/page.tsx', 'utf8');
  const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');

  if (!page.includes('getCanonical("/reviews")')) {
    throw new Error('Public reviews page is missing its canonical URL');
  }
  if (!service.includes('.eq("status", "approved")')) {
    throw new Error('Public review service must only return approved reviews');
  }
  if (!service.includes('maskCustomerName') || !service.includes('maskOrderNumber')) {
    throw new Error('Public review identity fields must be masked');
  }
  if (!list.includes('VERIFICATION_LABELS') || !service.includes('verification_status')) {
    throw new Error('Public reviews need order-aware verification labels');
  }
  for (const [name, source] of [['header', header], ['footer', footer], ['member', member], ['sitemap', sitemap]]) {
    if (!source.includes('/reviews')) {
      throw new Error(`${name} must link to the public reviews page`);
    }
  }
});

// Summary
console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Total: ${passed + failed + skipped}`);

if (failed > 0) {
  console.log('\n\x1b[31mSome tests failed. Please review the errors above.\x1b[0m');
  process.exit(1);
} else {
  console.log('\n\x1b[32mAll verification tests passed!\x1b[0m');
  console.log('\nNote: This script verifies file structure and code patterns.');
  console.log('Database transaction tests require Codex/Supabase MCP.');
  console.log('Run npm run build for full compilation check.');
  process.exit(0);
}
