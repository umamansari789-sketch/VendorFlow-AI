# VendorFlow AI

Vendor compliance **resolution** platform for property, facility and construction teams.
It doesn't just track documents: it detects a gap, tells the vendor exactly what to fix, collects the revision, routes it to a human for approval and keeps an audit trail.

**Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · TypeScript · Supabase (Postgres/Auth/Storage) · Gemini / OpenAI · Resend · Stripe · Vercel

## Run it

```bash
npm install
cp .env.example .env.local   # optional: the app runs without any keys
npm run dev
```

Open http://localhost:3000 and click **Open demo**.

With no keys configured the app runs in **demo mode**: no login, 8 seeded vendors, in-memory data that resets on restart. Each integration switches on when its keys are present:

| Feature | Needs | Without it |
|---|---|---|
| Login + organisations | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Demo mode, no login |
| AI document extraction | `GEMINI_API_KEY` or `OPENAI_API_KEY` | Reviewer enters expiry / endorsement manually |
| Follow-up emails | `RESEND_API_KEY` | Follow-up is logged, not delivered (UI says so) |
| Checkout | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*` | Billing page shows a setup notice |

## What's built

- **Dashboard**: compliance %, open / overdue gaps, documents awaiting review
- **Vendors**: list, add, per-vendor required documents (by category), upload with AI extraction, approve / reject
- **Gap resolution**: automatic scan (missing, expired, expiring within 30 days, rejected, missing endorsement), correction-request emails, reminders, an `in review` state when a revised document arrives, and auto-close only after human approval
- **Audit trail**: every upload, review, email and gap change
- **Billing**: Starter $49 / Growth $149 / Business $399 / Enterprise (custom), Stripe Checkout
- **Auth**: Supabase email/password, route protection via `src/proxy.ts`

AI only extracts and drafts. It never declares a vendor compliant; a reviewer approves every document.

## Important: what is NOT finished

1. **Data is in memory.** `src/lib/store.ts` is the demo data layer. `supabase/schema.sql` has the real tables with Row Level Security, but the pages are **not yet wired to Supabase queries**. Next step: replace the functions in `store.ts` with Supabase queries scoped by the user's `org_id`, keeping the same signatures.
2. **File storage.** Uploaded files are analysed but not stored. Create a private `vendor-documents` bucket and save to `<org_id>/<vendor_id>/<file>`.
3. **Vendor portal.** Vendors currently receive emails only; there is no self-service upload link yet.
4. **Stripe webhook** verifies signatures but doesn't write the plan back to `organizations` yet.
5. **Roles** (`owner/admin/reviewer/member`) exist in the schema but aren't enforced in the UI.
6. **No automated tests**, and security hardening (rate limits, virus scanning, SOC 2 work) is still ahead.

## Setup: Supabase

1. Create a project and run `supabase/schema.sql` in the SQL editor.
2. Put the project URL and anon key in `.env.local`.
3. Sign up in the app; the `create_organization` function creates your org and makes you owner.

## Setup: Stripe

Create three recurring prices (Starter, Growth, Business), put their IDs in `STRIPE_PRICE_*`, and point a webhook at `/api/stripe/webhook`.

## Project layout

```
src/app/            pages, server actions, API routes
src/app/(app)/      authenticated app (dashboard, vendors, gaps, audit, billing)
src/lib/store.ts    demo data layer + gap-detection rules
src/lib/ai.ts       Gemini, then OpenAI, then manual fallback extraction
src/proxy.ts        session refresh + route protection (Next 16 "proxy")
supabase/schema.sql database schema with RLS
```

Note: this Next.js version uses `proxy.ts` instead of `middleware.ts` and ships its docs in `node_modules/next/dist/docs/`.
