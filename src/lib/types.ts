export type PlanId = "starter" | "growth" | "business" | "enterprise";
export type Role = "owner" | "admin" | "reviewer" | "member";

export type VendorStatus = "compliant" | "at_risk" | "non_compliant" | "pending";
export type DocType =
  | "insurance_coi"
  | "business_license"
  | "tax_w9"
  | "safety_cert"
  | "contract"
  | "training";
export type DocStatus = "pending_review" | "approved" | "rejected" | "expired";
export type GapType =
  | "missing"
  | "expired"
  | "expiring"
  | "incomplete"
  | "coverage"
  | "endorsement";
export type GapStatus = "open" | "awaiting_vendor" | "in_review" | "resolved";

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName: string;
  contactEmail: string;
  location: string;
  status: VendorStatus;
  createdAt: string;
}

export interface ExtractedFields {
  documentType?: string;
  insurer?: string;
  policyNumber?: string;
  coverageAmount?: number | null;
  expiryDate?: string | null;
  endorsementPresent?: boolean | null;
  notes?: string;
  confidence?: number;
  source?: "gemini" | "openai" | "rules";
}

export interface VendorDocument {
  id: string;
  vendorId: string;
  docType: DocType;
  fileName: string;
  version: number;
  status: DocStatus;
  expiryDate: string | null;
  extracted: ExtractedFields;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ComplianceGap {
  id: string;
  vendorId: string;
  documentId?: string;
  docType?: DocType;
  type: GapType;
  title: string;
  reason: string;
  status: GapStatus;
  dueDate: string;
  createdAt: string;
  resolvedAt?: string;
  followUpsSent: number;
}

export interface FollowUp {
  id: string;
  gapId: string;
  vendorId: string;
  subject: string;
  body: string;
  sentTo: string;
  sentAt: string;
  delivered: boolean;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entityType: "vendor" | "document" | "gap" | "followup" | "system";
  entityId?: string;
  detail: string;
  createdAt: string;
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  insurance_coi: "Certificate of Insurance (COI)",
  business_license: "Business Licence",
  tax_w9: "Tax Document (W-9)",
  safety_cert: "Safety Certification",
  contract: "Signed Contract",
  training: "Training Record",
};

export const GAP_TYPE_LABELS: Record<GapType, string> = {
  missing: "Missing document",
  expired: "Expired document",
  expiring: "Expiring soon",
  incomplete: "Incomplete document",
  coverage: "Coverage needs review",
  endorsement: "Missing endorsement",
};
