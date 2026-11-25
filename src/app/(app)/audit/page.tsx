import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";
import { listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  const events = listAudit(200);
  return (
    <>
      <PageHeader title="Audit trail" description="Who submitted, reviewed, approved or changed what — and when." />
      <Card>
        <ul className="divide-y divide-slate-100">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{e.action}</p>
                <p className="text-xs text-slate-500">{e.detail}</p>
              </div>
              <div className="text-right">
                <Badge tone="slate">{e.actor}</Badge>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(e.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
