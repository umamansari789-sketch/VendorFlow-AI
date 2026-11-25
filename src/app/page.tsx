import Link from "next/link";
import { PricingGrid } from "@/components/pricing-grid";

const FLOW = ["Gap detected", "Reason identified", "Correction request sent", "Vendor notified", "Revised document collected", "Human approval", "Issue closed"];

const MODULES = [
  ["Vendor intelligence", "One profile per vendor with live compliance status across every location."],
  ["AI document reader", "Pulls document type, expiry date and key insurance fields out of PDFs and images."],
  ["Gap resolution", "Tracks missing, expired and rejected documents until each one is actually fixed."],
  ["Automated follow-ups", "Exact correction requests by email, reminders and deadline tracking."],
  ["Multi-location control", "Different requirements per property, branch or project."],
  ["Audit trail", "Every upload, rejection, approval and email recorded — who and when."],
];

export default function Home() {
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          Vendor<span className="text-indigo-600">Flow</span> AI
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#pricing" className="text-slate-600 hover:text-slate-900">Pricing</a>
          <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
          <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Open demo
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          For property, facility and construction teams
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Don&apos;t just track vendor documents. Close every compliance gap.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Most tools flag a bad certificate and leave your team to chase it. VendorFlow AI tells the vendor exactly what to fix, collects the
          revision, and routes it to a human for approval.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700">
            Try the demo
          </Link>
          <a href="#how" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-semibold text-slate-900">One workflow, from problem to proof</h2>
          <ol className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            {FLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">{step}</span>
                {i < FLOW.length - 1 && <span className="text-slate-400">→</span>}
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-slate-500">
            AI extracts and drafts. It never declares a vendor legally compliant — an authorised reviewer makes the final decision.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(([title, text]) => (
            <div key={title} className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">Simple monthly pricing</h2>
          <PricingGrid mode="marketing" />
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} VendorFlow AI (working name)</footer>
    </div>
  );
}
