import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewDocumentAction, uploadDocumentAction } from "@/app/actions";
import {
  Badge,
  Card,
  DocStatusBadge,
  GapStatusBadge,
  Notice,
  PageHeader,
  VendorStatusBadge,
  formatDate,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/ui";
import { aiConfigured } from "@/lib/ai";
import { REQUIREMENTS, daysUntil, getVendor, listDocuments, listGaps } from "@/lib/store";
import { DOC_TYPE_LABELS, GAP_TYPE_LABELS, type DocType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage(props: PageProps<"/vendors/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const vendor = getVendor(id);
  if (!vendor) notFound();

  const error = typeof sp.error === "string" ? sp.error : undefined;
  const uploaded = sp.uploaded === "1";
  const docs = listDocuments(vendor.id);
  const gaps = listGaps({ vendorId: vendor.id });
  const required = REQUIREMENTS[vendor.category] ?? [];
  const latest = new Map<DocType, (typeof docs)[number]>();
  for (const d of docs) {
    const cur = latest.get(d.docType);
    if (!cur || d.version > cur.version) latest.set(d.docType, d);
  }

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/vendors" className="text-indigo-600 hover:underline">
          ← Vendors
        </Link>
      </p>
      <PageHeader
        title={vendor.name}
        description={`${vendor.category} · ${vendor.location} · ${vendor.contactName} (${vendor.contactEmail})`}
        action={<VendorStatusBadge status={vendor.status} />}
      />
      {error && <Notice tone="red">{error}</Notice>}
      {uploaded && <Notice tone="green">Document uploaded. Review it below before it counts toward compliance.</Notice>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Required documents</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {required.map((type) => {
                const d = latest.get(type);
                const left = d?.expiryDate ? daysUntil(d.expiryDate) : null;
                return (
                  <li key={type} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{DOC_TYPE_LABELS[type]}</p>
                        {d ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {d.fileName} · v{d.version} · expires {formatDate(d.expiryDate)}
                            {left !== null && left < 0 && <span className="text-red-600"> (expired)</span>}
                            {left !== null && left >= 0 && left <= 30 && <span className="text-amber-600"> (in {left}d)</span>}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-red-600">Not provided</p>
                        )}
                        {d?.extracted.insurer && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {d.extracted.insurer}
                            {d.extracted.policyNumber ? ` · ${d.extracted.policyNumber}` : ""}
                            {d.extracted.coverageAmount ? ` · $${d.extracted.coverageAmount.toLocaleString()} coverage` : ""}
                            {d.extracted.endorsementPresent === false ? " · endorsement missing" : ""}
                          </p>
                        )}
                        {d?.extracted.notes && <p className="mt-0.5 text-xs text-slate-400">AI note: {d.extracted.notes}</p>}
                      </div>
                      {d && <DocStatusBadge status={d.status} />}
                    </div>
                    {d?.status === "pending_review" && (
                      <form action={reviewDocumentAction} className="mt-3 flex gap-2">
                        <input type="hidden" name="documentId" value={d.id} />
                        <button name="decision" value="approved" className={primaryButton}>
                          Approve
                        </button>
                        <button name="decision" value="rejected" className={secondaryButton}>
                          Reject
                        </button>
                        <span className="self-center text-xs text-slate-400">Final compliance decision is always yours.</span>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Upload a document</h2>
            <p className="mt-1 text-xs text-slate-500">
              PDF, PNG or JPG up to 8 MB.{" "}
              {aiConfigured()
                ? "AI will extract the expiry date and key fields; anything you enter below overrides it."
                : "AI extraction is not configured, so please enter the expiry date manually."}
            </p>
            <form action={uploadDocumentAction} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="vendorId" value={vendor.id} />
              <select name="docType" className={inputClass} defaultValue={required[0]}>
                {required.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <input name="file" type="file" required accept="application/pdf,image/png,image/jpeg" className={inputClass} />
              <label className="text-xs text-slate-500">
                Expiry date (optional)
                <input name="expiryDate" type="date" className={`${inputClass} mt-1`} />
              </label>
              <label className="text-xs text-slate-500">
                Additional-insured endorsement (COI only)
                <select name="endorsement" className={`${inputClass} mt-1`} defaultValue="">
                  <option value="">Let AI detect / unknown</option>
                  <option value="yes">Present</option>
                  <option value="no">Missing</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <button className={primaryButton}>Upload and analyse</button>
              </div>
            </form>
          </Card>
        </div>

        <Card className="h-fit">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Gaps</h2>
          </div>
          {gaps.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No gaps recorded.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {gaps.map((gap) => (
                <li key={gap.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="indigo">{GAP_TYPE_LABELS[gap.type]}</Badge>
                    <GapStatusBadge status={gap.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{gap.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
