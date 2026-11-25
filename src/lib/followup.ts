import type { ComplianceGap, Vendor } from "./types";
import { DOC_TYPE_LABELS } from "./types";

/** Builds the exact-correction request that goes to the vendor. Rule-based, so output is predictable. */
export function draftFollowUp(vendor: Vendor, gap: ComplianceGap, orgName = "our compliance team") {
  const doc = gap.docType ? DOC_TYPE_LABELS[gap.docType] : "the requested document";
  const lines: Record<ComplianceGap["type"], string> = {
    missing: `We have not yet received your ${doc}. Please upload it through your vendor portal or reply to this email with the file attached.`,
    expired: `Your ${doc} on file has expired. Please send an updated, currently valid copy.`,
    expiring: `Your ${doc} on file is about to expire. Please send the renewed copy before the deadline below so your compliance status stays active.`,
    incomplete: `The ${doc} you submitted could not be accepted because it was incomplete or incorrect. Please send a corrected copy.`,
    coverage: `The coverage shown on your ${doc} needs to be confirmed against our requirements. Please send a copy showing the required coverage limits.`,
    endorsement: `Your ${doc} is missing the required additional-insured endorsement. Please ask your insurance provider to issue a certificate that includes it.`,
  };

  const subject = `Action needed: ${doc} — ${vendor.name}`;
  const body = [
    `Hello ${vendor.contactName || "there"},`,
    "",
    lines[gap.type],
    "",
    `Issue: ${gap.reason}`,
    `Please respond by: ${gap.dueDate}`,
    "",
    "Once we receive the updated document, our team will review it and confirm.",
    "",
    "Thank you,",
    orgName,
  ].join("\n");

  return { subject, body };
}
