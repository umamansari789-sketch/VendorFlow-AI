import { NextResponse } from "next/server";
import { extractDocument } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/types";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];

/** POST multipart form: file + docType. Returns advisory extracted fields (never a compliance decision). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data body required" }, { status: 400 });
  }
  const file = form.get("file");
  const docType = String(form.get("docType") ?? "") as DocType;

  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!(docType in DOC_TYPE_LABELS)) return NextResponse.json({ error: "invalid docType" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large (max 8 MB)" }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "unsupported file type" }, { status: 415 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractDocument(
    { base64: buffer.toString("base64"), mime: file.type, fileName: file.name },
    docType,
  );
  return NextResponse.json({ extracted });
}
