import { Notice, PageHeader } from "@/components/ui";
import { PricingGrid } from "@/components/pricing-grid";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function BillingPage(props: PageProps<"/billing">) {
  const sp = await props.searchParams;
  return (
    <>
      <PageHeader title="Billing" description="Choose the plan that fits your vendor count." />
      {sp.status === "success" && <Notice tone="green">Payment received. Your plan will update shortly.</Notice>}
      {sp.status === "cancelled" && <Notice tone="amber">Checkout was cancelled. No charge was made.</Notice>}
      {!stripeConfigured() && (
        <Notice tone="amber">Stripe is not configured yet. Add STRIPE_SECRET_KEY and the plan price IDs to enable checkout.</Notice>
      )}
      <PricingGrid mode="billing" />
    </>
  );
}
