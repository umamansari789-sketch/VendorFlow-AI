import type { ReactNode } from "react";
import type { DocStatus, GapStatus, VendorStatus } from "@/lib/types";

export function formatDate(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date.length === 10 ? date + "T00:00:00Z" : date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const tones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function Badge({ tone = "slate", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const map: Record<VendorStatus, [string, keyof typeof tones]> = {
    compliant: ["Compliant", "green"],
    at_risk: ["At risk", "amber"],
    non_compliant: ["Non-compliant", "red"],
    pending: ["Pending", "slate"],
  };
  const [label, tone] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function DocStatusBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, [string, keyof typeof tones]> = {
    approved: ["Approved", "green"],
    pending_review: ["Needs review", "amber"],
    rejected: ["Rejected", "red"],
    expired: ["Expired", "red"],
  };
  const [label, tone] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function GapStatusBadge({ status }: { status: GapStatus }) {
  const map: Record<GapStatus, [string, keyof typeof tones]> = {
    open: ["Open", "red"],
    awaiting_vendor: ["Awaiting vendor", "amber"],
    in_review: ["In review", "blue"],
    resolved: ["Resolved", "green"],
  };
  const [label, tone] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "red" | "amber" | "green" }) {
  const color = tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-600" : "text-slate-900";
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

export function Notice({ tone = "blue", children }: { tone?: "blue" | "red" | "green" | "amber"; children: ReactNode }) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export const primaryButton =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";
