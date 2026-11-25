"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractDocument } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { draftFollowUp } from "@/lib/followup";
import {
  addDocument,
  createVendor,
  getGap,
  getVendor,
  manuallyResolveGap,
  recordFollowUp,
  reviewDocument,
  runScan,
} from "@/lib/store";
import type { DocType, ExtractedFields } from "@/lib/types";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"];

async function actor() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.name;
}

function refresh() {
  for (const p of ["/dashboard", "/vendors", "/gaps", "/audit"]) revalidatePath(p);
  revalidatePath("/vendors/[id]", "page");
}

const VendorSchema = z.object({
  name: z.string().trim().min(2, "Vendor name is required"),
  category: z.string().trim().min(1),
  contactName: z.string().trim().default(""),
  contactEmail: z.string().trim().email("Enter a valid contact email"),
  location: z.string().trim().default("Main location"),
});

export async function addVendorAction(formData: FormData) {
  const who = await actor();
  const parsed = VendorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid vendor details");
    redirect(`/vendors?error=${msg}`);
  }
  const vendor = createVendor(parsed.data, who);
  refresh();
  redirect(`/vendors/${vendor.id}`);
}

export async function uploadDocumentAction(formData: FormData) {
  const who = await actor();
  const vendorId = String(formData.get("vendorId") ?? "");
  const docType = String(formData.get("docType") ?? "") as DocType;
  const file = formData.get("file");
  const base = `/vendors/${vendorId}`;

  if (!getVendor(vendorId)) redirect("/vendors");
  if (!(file instanceof File) || file.size === 0) redirect(`${base}?error=${encodeURIComponent("Choose a file to upload")}`);
  if (file.size > MAX_FILE_BYTES) redirect(`${base}?error=${encodeURIComponent("File is larger than 8 MB")}`);
  if (!ALLOWED_MIME.includes(file.type)) redirect(`${base}?error=${encodeURIComponent("Only PDF, PNG or JPG files are allowed")}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted: ExtractedFields = await extractDocument(
    { base64: buffer.toString("base64"), mime: file.type, fileName: file.name },
    docType,
  );

  // Manual entries from the reviewer override AI output.
  const manualExpiry = String(formData.get("expiryDate") ?? "").trim();
  if (manualExpiry) {
    const parsedExpiry = /^\d{4}-\d{2}-\d{2}$/.test(manualExpiry)
      ? new Date(`${manualExpiry}T00:00:00Z`)
      : null;
    if (
      !parsedExpiry ||
      Number.isNaN(parsedExpiry.getTime()) ||
      parsedExpiry.toISOString().slice(0, 10) !== manualExpiry
    ) {
      redirect(`${base}?error=${encodeURIComponent("Enter a valid expiry date")}`);
    }
  }
  const expiryDate = manualExpiry || extracted.expiryDate || null;
  if (manualExpiry) extracted.expiryDate = manualExpiry;
  if (docType === "insurance_coi") {
    const endorsement = String(formData.get("endorsement") ?? "");
    if (endorsement === "yes") extracted.endorsementPresent = true;
    if (endorsement === "no") extracted.endorsementPresent = false;
  }

  addDocument({ vendorId, docType, fileName: file.name, expiryDate, extracted }, who);
  refresh();
  redirect(`${base}?uploaded=1`);
}

export async function reviewDocumentAction(formData: FormData) {
  const who = await actor();
  const id = String(formData.get("documentId") ?? "");
  const decision = formData.get("decision") === "approved" ? "approved" : "rejected";
  const doc = reviewDocument(id, decision, who);
  refresh();
  if (doc) redirect(`/vendors/${doc.vendorId}`);
}

export async function sendFollowUpAction(formData: FormData) {
  const who = await actor();
  const gapId = String(formData.get("gapId") ?? "");
  const gap = getGap(gapId);
  if (!gap) redirect("/gaps");
  const vendor = getVendor(gap.vendorId);
  if (!vendor) redirect("/gaps");

  const { subject, body } = draftFollowUp(vendor, gap);
  const result = await sendEmail({ to: vendor.contactEmail, subject, body });
  recordFollowUp(gapId, { subject, body, delivered: result.delivered }, who);
  refresh();
  redirect(`/gaps?sent=${result.delivered ? "delivered" : "logged"}`);
}

export async function resolveGapAction(formData: FormData) {
  const who = await actor();
  manuallyResolveGap(String(formData.get("gapId") ?? ""), who);
  refresh();
  redirect("/gaps");
}

export async function runScanAction() {
  const who = await actor();
  const created = runScan(who);
  refresh();
  redirect(`/gaps?scan=${created}`);
}
