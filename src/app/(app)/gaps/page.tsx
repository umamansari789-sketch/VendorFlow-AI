import Link from "next/link";
import { resolveGapAction, runScanAction, sendFollowUpAction } from "@/app/actions";
import { emailConfigured } from "@/lib/email";
import {
  Badge,
  Card,
  GapStatusBadge,
  Notice,
  PageHeader,
  formatDate,
  formatDateTime,
  primaryButton,
  secondaryButton,
} from "@/components/ui";
import { daysUntil, getVendor, listFollowUps, listGaps } from "@/lib/store";
import { GAP_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GapsPage(props: PageProps<"/gaps">) {
  const sp = await props.searchParams;
  const gaps = listGaps();
  const open = gaps.filter((g) => g.status !== "resolved");
  const resolved = gaps.filter((g) => g.status === "resolved");

  return (
    <>
      <PageHeader
        title="Gap resolution"
        description="Detect → ask the vendor for the exact fix → collect the revision → approve → close."
        action={
          <form action={runScanAction}>
            <button className={secondaryButton}>Run compliance scan</button>
          </form>
        }
      />

      {sp.sent === "delivered" && <Notice tone="green">Follow-up email sent to the vendor.</Notice>}
      {sp.sent === "logged" && (
        <Notice tone="amber">
          Follow-up recorded, but no email was delivered{emailConfigured() ? " (Resend returned an error)" : " because RESEND_API_KEY is not set"}.
        </Notice>
      )}
      {typeof sp.scan === "string" && <Notice tone="blue">Scan complete: {sp.scan} new gap(s) detected.</Notice>}

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Open ({open.length})</h2>
      {open.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-slate-500">All gaps are closed. 🎉</Card>
      ) : (
        <div className="space-y-3">
          {open.map((gap) => {
            const vendor = getVendor(gap.vendorId);
            const left = daysUntil(gap.dueDate);
            const followUps = listFollowUps(gap.id);
            return (
              <Card key={gap.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/vendors/${gap.vendorId}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                      {vendor?.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-slate-600">{gap.reason}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {GAP_TYPE_LABELS[gap.type]} · {gap.followUpsSent} follow-up(s) sent
                      {followUps[0] && ` · last ${formatDateTime(followUps[0].sentAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GapStatusBadge status={gap.status} />
                    <Badge tone={left < 0 ? "red" : "slate"}>{left < 0 ? `${Math.abs(left)}d overdue` : `Due ${formatDate(gap.dueDate)}`}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {gap.status !== "in_review" && (
                    <form action={sendFollowUpAction}>
                      <input type="hidden" name="gapId" value={gap.id} />
                      <button className={primaryButton}>{gap.followUpsSent ? "Send reminder" : "Send correction request"}</button>
                    </form>
                  )}
                  {gap.status === "in_review" && (
                    <Link href={`/vendors/${gap.vendorId}`} className={primaryButton}>
                      Review revised document
                    </Link>
                  )}
                  <form action={resolveGapAction}>
                    <input type="hidden" name="gapId" value={gap.id} />
                    <button className={secondaryButton}>Mark resolved</button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Resolved ({resolved.length})</h2>
          <Card>
            <ul className="divide-y divide-slate-100">
              {resolved.map((gap) => (
                <li key={gap.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-slate-600">
                    {getVendor(gap.vendorId)?.name} — {gap.reason}
                  </span>
                  <span className="text-xs text-slate-400">{gap.resolvedAt ? formatDateTime(gap.resolvedAt) : ""}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
