import { z } from "zod";
import type { DocType, ExtractedFields } from "./types";
import { DOC_TYPE_LABELS } from "./types";

const ExtractionSchema = z.object({
  documentType: z.string().optional(),
  insurer: z.string().nullish(),
  policyNumber: z.string().nullish(),
  coverageAmount: z.number().nullish(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  endorsementPresent: z.boolean().nullish(),
  notes: z.string().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
});

function buildPrompt(docType: DocType) {
  return [
    `You are reading a vendor compliance document. The vendor says it is: ${DOC_TYPE_LABELS[docType]}.`,
    "Extract the following and reply with ONLY a JSON object (no markdown):",
    "{",
    '  "documentType": string,          // what the document actually is',
    '  "insurer": string | null,        // insurance company, if any',
    '  "policyNumber": string | null,',
    '  "coverageAmount": number | null, // general liability each-occurrence limit in USD, if shown',
    '  "expiryDate": "YYYY-MM-DD" | null, // expiry / valid-until date; the EARLIEST one if several',
    '  "endorsementPresent": boolean | null, // true only if an additional-insured endorsement is explicitly shown; null if not an insurance document',
    '  "notes": string,                 // anything unclear, missing or inconsistent',
    '  "confidence": number             // 0 to 1',
    "}",
    "Never guess. Use null when a value is not clearly visible. You are NOT deciding compliance; a human reviewer will do that.",
  ].join("\n");
}

function parseJSON(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function viaGemini(base64: string, mime: string, docType: DocType): Promise<ExtractedFields> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(docType) }, { inline_data: { mime_type: mime, data: base64 } }],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { ...normalize(parseJSON(text)), source: "gemini" };
}

async function viaOpenAI(base64: string, mime: string, fileName: string, docType: DocType): Promise<ExtractedFields> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isImage = mime.startsWith("image/");
  const filePart = isImage
    ? { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }
    : { type: "file", file: { filename: fileName, file_data: `data:${mime};base64,${base64}` } };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: buildPrompt(docType) }, filePart] }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json = await res.json();
  const text: string = json?.choices?.[0]?.message?.content ?? "";
  return { ...normalize(parseJSON(text)), source: "openai" };
}

function normalize(raw: unknown): ExtractedFields {
  const p = ExtractionSchema.parse(raw);
  return {
    documentType: p.documentType,
    insurer: p.insurer ?? undefined,
    policyNumber: p.policyNumber ?? undefined,
    coverageAmount: p.coverageAmount ?? null,
    expiryDate: p.expiryDate ?? null,
    endorsementPresent: p.endorsementPresent ?? null,
    notes: p.notes ?? undefined,
    confidence: p.confidence ?? undefined,
  };
}

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Extract key fields from an uploaded document.
 * Tries Gemini, then OpenAI, then falls back to a rules-only result so the workflow never blocks.
 * The result is advisory — a human reviewer always makes the compliance decision.
 */
export async function extractDocument(
  file: { base64: string; mime: string; fileName: string },
  docType: DocType,
): Promise<ExtractedFields> {
  const attempts: Array<() => Promise<ExtractedFields>> = [];
  if (process.env.GEMINI_API_KEY) attempts.push(() => viaGemini(file.base64, file.mime, docType));
  if (process.env.OPENAI_API_KEY) attempts.push(() => viaOpenAI(file.base64, file.mime, file.fileName, docType));

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (err) {
      console.error("AI extraction attempt failed:", err instanceof Error ? err.message : err);
    }
  }

  return {
    documentType: DOC_TYPE_LABELS[docType],
    source: "rules",
    confidence: 0,
    notes: aiConfigured()
      ? "AI extraction failed; please enter details manually."
      : "AI extraction is not configured (no GEMINI_API_KEY or OPENAI_API_KEY). Details were entered manually.",
  };
}
