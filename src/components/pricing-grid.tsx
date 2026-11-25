import Link from "next/link";
import { CheckoutButton } from "./checkout-button";
import { PLANS } from "@/lib/plans";

export function PricingGrid({ mode }: { mode: "marketing" | "billing" }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${plan.highlight ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"}`}
        >
          {plan.highlight && <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">Recommended</span>}
          <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {plan.priceMonthly ? `$${plan.priceMonthly}` : "Custom"}
            {plan.priceMonthly && <span className="text-sm font-normal text-slate-500"> / month</span>}
          </p>
          <p className="mt-1 text-sm text-slate-500">{plan.vendors}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {mode === "billing" && plan.priceMonthly ? (
              <CheckoutButton plan={plan.id} label={`Choose ${plan.name}`} />
            ) : plan.priceMonthly ? (
              <Link href="/signup" className="block rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-700">
                Start free trial
              </Link>
            ) : (
              <a href="mailto:sales@vendorflow.example" className="block rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                Contact sales
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
