import type {
  AuditEvent,
  ComplianceGap,
  DocStatus,
  DocType,
  ExtractedFields,
  FollowUp,
  GapStatus,
  GapType,
  Vendor,
  VendorDocument,
  VendorStatus,
} from "./types";
import { DOC_TYPE_LABELS } from "./types";

/**
 * In-memory data layer used for demo mode (no database needed to try the app).
 * Mirrors the tables in supabase/schema.sql so it can be swapped for Supabase queries.
 * Data resets when the server restarts.
 */

export const VENDOR_CATEGORIES = [
  "Cleaning",
  "Electrical",
  "HVAC",
  "Plumbing",
  "Maintenance",
  "Security",
  "Landscaping",
  "General Contractor",
] as const;

/** Documents every vendor category must provide. COI additionally needs an endorsement. */
export const REQUIREMENTS: Record<string, DocType[]> = {
  Cleaning: ["insurance_coi", "business_license", "tax_w9", "contract"],
  Electrical: ["insurance_coi", "business_license", "tax_w9", "safety_cert", "contract"],
  HVAC: ["insurance_coi", "business_license", "tax_w9", "safety_cert"],
  Plumbing: ["insurance_coi", "business_license", "tax_w9", "safety_cert"],
  Maintenance: ["insurance_coi", "business_license", "tax_w9", "training"],
  Security: ["insurance_coi", "business_license", "tax_w9", "training", "contract"],
  Landscaping: ["insurance_coi", "business_license", "tax_w9"],
  "General Contractor": ["insurance_coi", "business_license", "tax_w9", "safety_cert", "contract"],
};

const EXPIRING_DAYS = 30;
const DUE_DAYS = 14;
const MINIMUM_COI_COVERAGE = 1_000_000;

interface DB {
  vendors: Vendor[];
  documents: VendorDocument[];
  gaps: ComplianceGap[];
  followUps: FollowUp[];
  audit: AuditEvent[];
  seq: number;
}

const g = globalThis as unknown as { __vendorflowDB?: DB };

function uid(db: DB, prefix: string) {
  db.seq += 1;
  return `${prefix}_${db.seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string | Date, days: number) {
  const d = typeof date === "string" ? new Date(date + "T00:00:00Z") : new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date: string) {
  const a = new Date(todayISO() + "T00:00:00Z").getTime();
  const b = new Date(date + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

function log(
  db: DB,
  actor: string,
  action: string,
  entityType: AuditEvent["entityType"],
  detail: string,
  entityId?: string,
) {
  db.audit.unshift({
    id: uid(db, "evt"),
    actor,
    action,
    entityType,
    entityId,
    detail,
    createdAt: new Date().toISOString(),
  });
}

function seed(): DB {
  const db: DB = { vendors: [], documents: [], gaps: [], followUps: [], audit: [], seq: 0 };
  const now = new Date().toISOString();

  const vendorSeed: Array<[string, string, string, string, string]> = [
    ["BrightClean Services", "Cleaning", "Maria Lopez", "maria@brightclean.example", "Riverside Plaza"],
    ["Voltline Electric", "Electrical", "James Carter", "james@voltline.example", "Harbor Tower"],
    ["CoolAir HVAC Pros", "HVAC", "Priya Nair", "priya@coolair.example", "Riverside Plaza"],
    ["AquaFix Plumbing", "Plumbing", "Tom Becker", "tom@aquafix.example", "Maple Court"],
    ["Guardian Security Group", "Security", "Ana Reyes", "ana@guardian.example", "Harbor Tower"],
    ["GreenEdge Landscaping", "Landscaping", "Luke Wong", "luke@greenedge.example", "Maple Court"],
    ["SteadyHands Maintenance", "Maintenance", "Olivia Park", "olivia@steadyhands.example", "Riverside Plaza"],
    ["Ironbridge Builders", "General Contractor", "Daniel Kim", "daniel@ironbridge.example", "Harbor Tower"],
  ];

  for (const [name, category, contactName, contactEmail, location] of vendorSeed) {
    db.vendors.push({
      id: uid(db, "ven"),
      name,
      category,
      contactName,
      contactEmail,
      location,
      status: "pending",
      createdAt: now,
    });
  }

  const doc = (
    v: number,
    docType: DocType,
    opts: {
      expiryOffset?: number | null;
      status?: DocStatus;
      endorsement?: boolean | null;
      coverage?: number | null;
      version?: number;
    } = {},
  ) => {
    const vendor = db.vendors[v];
    const expiry = opts.expiryOffset == null ? null : addDays(todayISO(), opts.expiryOffset);
    const extracted: ExtractedFields = {
      documentType: DOC_TYPE_LABELS[docType],
      expiryDate: expiry,
      source: "rules",
      confidence: 0.9,
    };
    if (docType === "insurance_coi") {
      extracted.insurer = "Northwind Mutual";
      extracted.policyNumber = "NM-" + Math.floor(100000 + Math.random() * 899999);
      extracted.coverageAmount = opts.coverage ?? 2_000_000;
      extracted.endorsementPresent = opts.endorsement ?? true;
    }
    db.documents.push({
      id: uid(db, "doc"),
      vendorId: vendor.id,
      docType,
      fileName: `${vendor.name.split(" ")[0].toLowerCase()}-${docType}.pdf`,
      version: opts.version ?? 1,
      status: opts.status ?? "approved",
      expiryDate: expiry,
      extracted,
      uploadedAt: now,
      reviewedBy: opts.status === "pending_review" ? undefined : "Demo Reviewer",
      reviewedAt: opts.status === "pending_review" ? undefined : now,
    });
  };

  // 0 BrightClean — fully compliant
  doc(0, "insurance_coi", { expiryOffset: 240 });
  doc(0, "business_license", { expiryOffset: 300 });
  doc(0, "tax_w9");
  doc(0, "contract", { expiryOffset: 400 });
  // 1 Voltline — COI expired, safety cert missing
  doc(1, "insurance_coi", { expiryOffset: -12, status: "approved" });
  doc(1, "business_license", { expiryOffset: 200 });
  doc(1, "tax_w9");
  doc(1, "contract", { expiryOffset: 365 });
  // 2 CoolAir — COI missing endorsement (pending review)
  doc(2, "insurance_coi", { expiryOffset: 150, endorsement: false, status: "pending_review" });
  doc(2, "business_license", { expiryOffset: 100 });
  doc(2, "tax_w9");
  doc(2, "safety_cert", { expiryOffset: 180 });
  // 3 AquaFix — COI expiring soon
  doc(3, "insurance_coi", { expiryOffset: 12 });
  doc(3, "business_license", { expiryOffset: 220 });
  doc(3, "tax_w9");
  doc(3, "safety_cert", { expiryOffset: 220 });
  // 4 Guardian — missing licence + training
  doc(4, "insurance_coi", { expiryOffset: 200 });
  doc(4, "tax_w9");
  doc(4, "contract", { expiryOffset: 300 });
  // 5 GreenEdge — compliant
  doc(5, "insurance_coi", { expiryOffset: 260 });
  doc(5, "business_license", { expiryOffset: 260 });
  doc(5, "tax_w9");
  // 6 SteadyHands — new vendor, nothing uploaded except W-9
  doc(6, "tax_w9");
  // 7 Ironbridge — rejected licence
  doc(7, "insurance_coi", { expiryOffset: 320 });
  doc(7, "business_license", { expiryOffset: 40, status: "rejected" });
  doc(7, "tax_w9");
  doc(7, "safety_cert", { expiryOffset: 200 });
  doc(7, "contract", { expiryOffset: 200 });

  log(db, "System", "Workspace seeded", "system", "Demo data loaded for 8 vendors");
  scan(db, "System");
  return db;
}

function getDB(): DB {
  if (!g.__vendorflowDB) g.__vendorflowDB = seed();
  return g.__vendorflowDB;
}

function latestDoc(db: DB, vendorId: string, docType: DocType) {
  return db.documents
    .filter((d) => d.vendorId === vendorId && d.docType === docType)
    .sort((a, b) => b.version - a.version)[0];
}

function openGapExists(db: DB, vendorId: string, docType: DocType, type: GapType) {
  return db.gaps.some(
    (x) => x.vendorId === vendorId && x.docType === docType && x.type === type && x.status !== "resolved",
  );
}

function createGap(
  db: DB,
  vendor: Vendor,
  docType: DocType,
  type: GapType,
  reason: string,
  documentId: string | undefined,
  actor: string,
) {
  if (openGapExists(db, vendor.id, docType, type)) return false;
  const label = DOC_TYPE_LABELS[docType];
  const gap: ComplianceGap = {
    id: uid(db, "gap"),
    vendorId: vendor.id,
    documentId,
    docType,
    type,
    title: `${label} — ${type === "missing" ? "not provided" : type}`,
    reason,
    status: "open",
    dueDate: addDays(todayISO(), DUE_DAYS),
    createdAt: new Date().toISOString(),
    followUpsSent: 0,
  };
  db.gaps.push(gap);
  log(db, actor, "Gap detected", "gap", `${vendor.name}: ${reason}`, gap.id);
  return true;
}

/** Resolve gaps that no longer apply (document replaced/approved). */
function autoResolve(db: DB, actor: string) {
  for (const gap of db.gaps) {
    if (gap.status === "resolved" || !gap.docType) continue;
    const d = latestDoc(db, gap.vendorId, gap.docType);
    if (!d) continue;
    const expired = d.expiryDate ? daysUntil(d.expiryDate) < 0 : false;
    const expiring = d.expiryDate ? daysUntil(d.expiryDate) <= EXPIRING_DAYS : false;
    let stillBad = false;
    if (gap.type === "missing") stillBad = false; // a doc now exists
    if (gap.type === "expired") stillBad = expired;
    if (gap.type === "expiring") stillBad = expiring;
    if (gap.type === "endorsement") stillBad = d.extracted.endorsementPresent === false;
    if (gap.type === "incomplete") stillBad = d.status === "rejected";
    if (gap.type === "coverage") {
      stillBad = d.extracted.coverageAmount != null && d.extracted.coverageAmount < MINIMUM_COI_COVERAGE;
    }
    if (!stillBad) {
      // Gap is only closed once the replacement is human-approved (or it is a plain "missing" gap
      // whose document is now awaiting review).
      if (d.status === "approved") {
        gap.status = "resolved";
        gap.resolvedAt = new Date().toISOString();
        log(db, actor, "Gap closed", "gap", `${gap.title} — replacement approved`, gap.id);
      } else if (d.status === "pending_review" && gap.status !== "in_review") {
        gap.status = "in_review";
        log(db, actor, "Gap moved to review", "gap", `${gap.title} — revised document received`, gap.id);
      }
    }
  }
}

function recomputeStatuses(db: DB) {
  for (const v of db.vendors) {
    const open = db.gaps.filter((x) => x.vendorId === v.id && x.status !== "resolved");
    let status: VendorStatus = "compliant";
    if (open.some((x) => x.type === "missing" || x.type === "expired" || x.type === "incomplete" || x.type === "endorsement" || x.type === "coverage")) {
      status = "non_compliant";
    } else if (open.length > 0) {
      status = "at_risk";
    }
    const required = REQUIREMENTS[v.category] ?? [];
    const hasAny = db.documents.some((d) => d.vendorId === v.id);
    if (!hasAny && required.length > 0) status = "pending";
    v.status = status;
  }
}

function scan(db: DB, actor: string) {
  let created = 0;
  for (const vendor of db.vendors) {
    const required = REQUIREMENTS[vendor.category] ?? [];
    for (const docType of required) {
      const d = latestDoc(db, vendor.id, docType);
      if (!d) {
        if (createGap(db, vendor, docType, "missing", `${DOC_TYPE_LABELS[docType]} has not been provided`, undefined, actor)) created++;
        continue;
      }
      if (d.status === "rejected") {
        if (createGap(db, vendor, docType, "incomplete", `${DOC_TYPE_LABELS[docType]} was rejected and needs a corrected copy`, d.id, actor)) created++;
      }
      if (d.expiryDate) {
        const left = daysUntil(d.expiryDate);
        if (left < 0) {
          if (createGap(db, vendor, docType, "expired", `${DOC_TYPE_LABELS[docType]} expired ${Math.abs(left)} day(s) ago (${d.expiryDate})`, d.id, actor)) created++;
        } else if (left <= EXPIRING_DAYS) {
          if (createGap(db, vendor, docType, "expiring", `${DOC_TYPE_LABELS[docType]} expires in ${left} day(s) (${d.expiryDate})`, d.id, actor)) created++;
        }
      }
      if (docType === "insurance_coi" && d.extracted.endorsementPresent === false) {
        if (createGap(db, vendor, docType, "endorsement", "Certificate of Insurance is missing the required additional-insured endorsement", d.id, actor)) created++;
      }
      if (
        docType === "insurance_coi" &&
        d.extracted.coverageAmount != null &&
        d.extracted.coverageAmount < MINIMUM_COI_COVERAGE
      ) {
        if (
          createGap(
            db,
            vendor,
            docType,
            "coverage",
            `Certificate of Insurance coverage is below the $${MINIMUM_COI_COVERAGE.toLocaleString()} minimum`,
            d.id,
            actor,
          )
        ) created++;
      }
    }
  }
  autoResolve(db, actor);
  recomputeStatuses(db);
  return created;
}

// ───────────────────────── Public API ─────────────────────────

export function listVendors(): Vendor[] {
  return [...getDB().vendors];
}

export function getVendor(id: string): Vendor | undefined {
  return getDB().vendors.find((v) => v.id === id);
}

export function createVendor(
  input: { name: string; category: string; contactName: string; contactEmail: string; location: string },
  actor = "You",
): Vendor {
  const db = getDB();
  const vendor: Vendor = {
    id: uid(db, "ven"),
    ...input,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.vendors.push(vendor);
  log(db, actor, "Vendor created", "vendor", `${vendor.name} (${vendor.category})`, vendor.id);
  scan(db, actor);
  return vendor;
}

export function listDocuments(vendorId?: string): VendorDocument[] {
  const docs = getDB().documents;
  return (vendorId ? docs.filter((d) => d.vendorId === vendorId) : [...docs]).sort(
    (a, b) => b.uploadedAt.localeCompare(a.uploadedAt),
  );
}

export function addDocument(
  input: {
    vendorId: string;
    docType: DocType;
    fileName: string;
    expiryDate: string | null;
    extracted: ExtractedFields;
  },
  actor = "You",
): VendorDocument {
  const db = getDB();
  const prev = latestDoc(db, input.vendorId, input.docType);
  const doc: VendorDocument = {
    id: uid(db, "doc"),
    vendorId: input.vendorId,
    docType: input.docType,
    fileName: input.fileName,
    version: (prev?.version ?? 0) + 1,
    status: "pending_review",
    expiryDate: input.expiryDate,
    extracted: input.extracted,
    uploadedAt: new Date().toISOString(),
  };
  db.documents.push(doc);
  const vendor = getVendor(input.vendorId);
  log(
    db,
    actor,
    prev ? `Document v${doc.version} uploaded` : "Document uploaded",
    "document",
    `${vendor?.name}: ${DOC_TYPE_LABELS[input.docType]} (${input.fileName})`,
    doc.id,
  );
  scan(db, actor);
  return doc;
}

export function reviewDocument(
  id: string,
  decision: "approved" | "rejected",
  actor = "You",
): VendorDocument | undefined {
  const db = getDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return undefined;
  doc.status = decision;
  doc.reviewedBy = actor;
  doc.reviewedAt = new Date().toISOString();
  const vendor = getVendor(doc.vendorId);
  log(
    db,
    actor,
    decision === "approved" ? "Document approved" : "Document rejected",
    "document",
    `${vendor?.name}: ${DOC_TYPE_LABELS[doc.docType]} v${doc.version}`,
    doc.id,
  );
  scan(db, actor);
  return doc;
}

export function listGaps(filter?: { status?: GapStatus | "open_all"; vendorId?: string }): ComplianceGap[] {
  let gaps = [...getDB().gaps];
  if (filter?.vendorId) gaps = gaps.filter((x) => x.vendorId === filter.vendorId);
  if (filter?.status === "open_all") gaps = gaps.filter((x) => x.status !== "resolved");
  else if (filter?.status) gaps = gaps.filter((x) => x.status === filter.status);
  return gaps.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getGap(id: string) {
  return getDB().gaps.find((x) => x.id === id);
}

export function listFollowUps(gapId?: string): FollowUp[] {
  const all = getDB().followUps;
  return (gapId ? all.filter((f) => f.gapId === gapId) : [...all]).sort((a, b) =>
    b.sentAt.localeCompare(a.sentAt),
  );
}

export function recordFollowUp(
  gapId: string,
  data: { subject: string; body: string; delivered: boolean },
  actor = "You",
): FollowUp | undefined {
  const db = getDB();
  const gap = getGap(gapId);
  if (!gap) return undefined;
  const vendor = getVendor(gap.vendorId);
  if (!vendor) return undefined;
  const fu: FollowUp = {
    id: uid(db, "fu"),
    gapId,
    vendorId: vendor.id,
    subject: data.subject,
    body: data.body,
    sentTo: vendor.contactEmail,
    sentAt: new Date().toISOString(),
    delivered: data.delivered,
  };
  db.followUps.push(fu);
  gap.followUpsSent += 1;
  if (gap.status === "open") gap.status = "awaiting_vendor";
  log(
    db,
    actor,
    data.delivered ? "Follow-up sent" : "Follow-up logged (email not configured)",
    "followup",
    `${vendor.name}: ${data.subject}`,
    fu.id,
  );
  return fu;
}

export function manuallyResolveGap(id: string, actor = "You") {
  const db = getDB();
  const gap = getGap(id);
  if (!gap) return undefined;
  gap.status = "resolved";
  gap.resolvedAt = new Date().toISOString();
  const vendor = getVendor(gap.vendorId);
  log(db, actor, "Gap closed manually", "gap", `${vendor?.name}: ${gap.title}`, gap.id);
  recomputeStatuses(db);
  return gap;
}

export function runScan(actor = "You") {
  const db = getDB();
  const created = scan(db, actor);
  log(db, actor, "Compliance scan run", "system", `${created} new gap(s) detected`);
  return created;
}

export function listAudit(limit = 100): AuditEvent[] {
  return getDB().audit.slice(0, limit);
}

export function getAnalytics() {
  const db = getDB();
  const open = db.gaps.filter((x) => x.status !== "resolved");

  const gapsByType: Record<GapType, number> = {
    missing: 0,
    expired: 0,
    expiring: 0,
    incomplete: 0,
    coverage: 0,
    endorsement: 0,
  };
  for (const gap of open) gapsByType[gap.type]++;

  const categories = new Map<string, { total: number; compliant: number }>();
  for (const v of db.vendors) {
    const c = categories.get(v.category) ?? { total: 0, compliant: 0 };
    c.total++;
    if (v.status === "compliant") c.compliant++;
    categories.set(v.category, c);
  }
  const byCategory = [...categories.entries()]
    .map(([category, c]) => ({ category, ...c, pct: Math.round((c.compliant / c.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  // Latest version of each vendor/document type, bucketed by days to expiry.
  const latest = new Map<string, VendorDocument>();
  for (const d of db.documents) {
    const key = `${d.vendorId}:${d.docType}`;
    const cur = latest.get(key);
    if (!cur || d.version > cur.version) latest.set(key, d);
  }
  const expiry = { expired: 0, d30: 0, d60: 0, d90: 0 };
  for (const d of latest.values()) {
    if (!d.expiryDate) continue;
    const left = daysUntil(d.expiryDate);
    if (left < 0) expiry.expired++;
    else if (left <= 30) expiry.d30++;
    else if (left <= 60) expiry.d60++;
    else if (left <= 90) expiry.d90++;
  }

  const resolved = db.gaps.filter((x) => x.status === "resolved" && x.resolvedAt);
  const avgResolutionDays = resolved.length
    ? Math.round(
        (resolved.reduce((s, x) => s + (new Date(x.resolvedAt!).getTime() - new Date(x.createdAt).getTime()), 0) /
          resolved.length /
          86_400_000) *
          10,
      ) / 10
    : null;

  const topRisk = db.vendors
    .map((v) => ({ vendor: v, openGaps: open.filter((x) => x.vendorId === v.id).length }))
    .filter((x) => x.openGaps > 0)
    .sort((a, b) => b.openGaps - a.openGaps)
    .slice(0, 5);

  return {
    gapsByType,
    byCategory,
    expiry,
    avgResolutionDays,
    followUpsSent: db.followUps.length,
    topRisk,
  };
}

export function getStats() {
  const db = getDB();
  const vendors = db.vendors;
  const open = db.gaps.filter((x) => x.status !== "resolved");
  const overdue = open.filter((x) => daysUntil(x.dueDate) < 0);
  const resolved = db.gaps.filter((x) => x.status === "resolved");
  const byStatus: Record<VendorStatus, number> = { compliant: 0, at_risk: 0, non_compliant: 0, pending: 0 };
  for (const v of vendors) byStatus[v.status]++;
  const compliantPct = vendors.length ? Math.round((byStatus.compliant / vendors.length) * 100) : 0;
  const expiring = db.documents.filter((d) => {
    if (!d.expiryDate) return false;
    const left = daysUntil(d.expiryDate);
    return left >= 0 && left <= EXPIRING_DAYS;
  }).length;
  return {
    vendorCount: vendors.length,
    byStatus,
    compliantPct,
    openGaps: open.length,
    overdueGaps: overdue.length,
    resolvedGaps: resolved.length,
    awaitingVendor: open.filter((x) => x.status === "awaiting_vendor").length,
    inReview: open.filter((x) => x.status === "in_review").length,
    expiringSoon: expiring,
    pendingReview: db.documents.filter((d) => d.status === "pending_review").length,
  };
}
