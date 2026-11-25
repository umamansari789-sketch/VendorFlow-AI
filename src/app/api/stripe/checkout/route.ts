import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PRICE_IDS, getStripe, stripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }

  const { plan } = (await request.json().catch(() => ({}))) as { plan?: string };
  const price = plan ? PRICE_IDS[plan] : undefined;
  if (!price) {
    return NextResponse.json({ error: `No Stripe price configured for plan "${plan}".` }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: user.demo ? undefined : user.email,
    success_url: `${origin}/billing?status=success`,
    cancel_url: `${origin}/billing?status=cancelled`,
    metadata: { plan: plan! },
  });
  return NextResponse.json({ url: session.url });
}
