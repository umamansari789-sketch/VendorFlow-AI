import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook. The signature is verified; plan changes should then be written to
 * organizations.plan / stripe_* columns using a Supabase service-role client (TODO when
 * connecting a real database).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const payload = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      console.log("Stripe event received:", event.type);
      break;
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
