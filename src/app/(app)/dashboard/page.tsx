import Link from "next/link";
import { runScanAction } from "@/app/actions";
import {
  Badge,
  Card,
  GapStatusBadge,
  PageHeader,
  StatCard,
  VendorStatusBadge,
  formatDate,
  formatDateTime,
  primaryButton,
  secondaryButton,
} from "@/components/ui";
import { daysUntil, getAnalytics, getStats, getVendor, listAudit, listGaps } from "@/lib/store";
import { GAP_TYPE_LABELS, type GapType } from "@/lib/types";

export const dynamic = "force-dynamic";

const GAP_COLORS: Record<GapType, string> = {
  missing: "bg-red-500",
  expired: "bg-rose-500",
  expiring: "bg-amber-500",
  incomplete: "bg-orange-500",
  coverage: "bg-violet-500",
  endorsement: "bg-indigo-500",
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const stats = getStats();
  const analytics = getAnalytics();
  const urgent = listGaps({ status: "open_all" }).slice(0, 6);
  const activity = listAudit(6);

  // Donut: share of vendors by status, drawn with an SVG ring.
  const segments = [
    { label: "Compliant", value: stats.byStatus.compliant, color: "#10b981" },
    { label: "At risk", value: stats.byStatus.at_risk, color: "#f59e0b" },
    { label: "Non-compliant", value: stats.byStatus.non_compliant, color: "#ef4444" },
    { label: "Pending", value: stats.byStatus.pending, color: "#94a3b8" },
  ];
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  const gapTypeRows = (Object.entries(analytics.gapsByType) as [GapType, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const maxGap = Math.max(1, ...gapTypeRows.map(([, n]) => n));
  const expiryRows = [
    { label: "Already expired", value: analytics.expiry.expired, color: "bg-red-500" },
    { label: "Within 30 days", value: analytics.expiry.d30, color: "bg-amber-500" },
    { label: "31–60 days", value: analytics.expiry.d60, color: "bg-yellow-400" },
    { label: "61–90 days", value: analytics.expiry.d90, color: "bg-emerald-400" },
  ];
  const maxExpiry = Math.max(1, ...expiryRows.map((r) => r.value));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where your vendor compliance stands today."
        action={
          <div className="flex gap-2">
            <form action={runScanAction}>
              <button className={secondaryButton}>Run scan</button>
            </form>
            <Link href="/vendors" className={primaryButton}>
              Add vendor
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendors" value={stats.vendorCount} hint={`${stats.compliantPct}% fully compliant`} />
        <StatCard label="Open gaps" value={stats.openGaps} tone={stats.openGaps ? "amber" : "green"} hint={`${stats.awaitingVendor} awaiting vendor · ${stats.inReview} in review`} />
        <StatCard label="Overdue" value={stats.overdueGaps} tone={stats.overdueGaps ? "red" : "green"} hint="Past response deadline" />
        <StatCard label="Needs your review" value={stats.pendingReview} hint="Documents awaiting approval" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Gaps closed" value={stats.resolvedGaps} tone="green" />
        <StatCard label="Avg. time to close" value={analytics.avgResolutionDays === null ? "—" : `${analytics.avgResolutionDays}d`} hint="From detection to approval" />
        <StatCard label="Follow-ups sent" value={analytics.followUpsSent} hint="Correction requests and reminders" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Vendor status</h2>
          <div className="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label="Vendor status breakdown">
              <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
              {stats.vendorCount > 0 &&
                segments.map((s) => {
                  const len = (s.value / stats.vendorCount) * C;
                  const el = (
                    <circle
                      key={s.label}
                      cx="70"
                      cy="70"
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="18"
                      strokeDasharray={`${len} ${C - len}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += len;
                  return el;
                })}
            </svg>
            <ul className="space-y-2 text-sm">
              {segments.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-600">{s.label}</span>
                  <span className="font-medium text-slate-900">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Open gaps by type</h2>
          {gapTypeRows.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No open gaps.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {gapTypeRows.map(([type, n]) => (
                <li key={type}>
                  <div className="flex justify-between text-slate-600">
                    <span>{GAP_TYPE_LABELS[type]}</span>
                    <span className="font-medium text-slate-900">{n}</span>
                  </div>
                  <Bar pct={(n / maxGap) * 100} color={GAP_COLORS[type]} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Document expiry timeline</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {expiryRows.map((r) => (
              <li key={r.label}>
                <div className="flex justify-between text-slate-600">
                  <span>{r.label}</span>
                  <span className="font-medium text-slate-900">{r.value}</span>
                </div>
                <Bar pct={(r.value / maxExpiry) * 100} color={r.color} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Compliance by category</h2>
          <p className="text-xs text-slate-400">Lowest first</p>
          <ul className="mt-4 space-y-3 text-sm">
            {analytics.byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex justify-between text-slate-600">
                  <span>{c.category}</span>
                  <span className="font-medium text-slate-900">
                    {c.compliant}/{c.total} · {c.pct}%
                  </span>
                </div>
                <Bar pct={c.pct} color={c.pct >= 80 ? "bg-emerald-500" : c.pct >= 40 ? "bg-amber-500" : "bg-red-500"} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Highest-risk vendors</h2>
          {analytics.topRisk.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No vendors with open gaps.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {analytics.topRisk.map(({ vendor, openGaps }) => (
                <li key={vendor.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/vendors/${vendor.id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                      {vendor.name}
                    </Link>
                    <p className="text-xs text-slate-500">{openGaps} open gap(s)</p>
                  </div>
                  <VendorStatusBadge status={vendor.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <Link href="/audit" className="text-xs font-medium text-indigo-600 hover:underline">
              Audit trail
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {activity.map((e) => (
              <li key={e.id}>
                <p className="text-sm text-slate-900">{e.action}</p>
                <p className="text-xs text-slate-500">{e.detail}</p>
                <p className="text-xs text-slate-400">
                  {e.actor} · {formatDateTime(e.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Gaps that need action</h2>
          <Link href="/gaps" className="text-sm font-medium text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        {urgent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No open gaps. Every vendor is up to date.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {urgent.map((gap) => {
              const vendor = getVendor(gap.vendorId);
              const left = daysUntil(gap.dueDate);
              return (
                <li key={gap.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <Link href={`/vendors/${gap.vendorId}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                      {vendor?.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {GAP_TYPE_LABELS[gap.type]} · {gap.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GapStatusBadge status={gap.status} />
                    <Badge tone={left < 0 ? "red" : "slate"}>{left < 0 ? `${Math.abs(left)}d overdue` : `Due ${formatDate(gap.dueDate)}`}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
