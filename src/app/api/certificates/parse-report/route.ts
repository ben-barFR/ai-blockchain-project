import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/ai/gemini";
import { reportParseSchema } from "@/lib/certificates/parse-report";
import {
  isPdfFile,
  MAX_REPORT_PDF_BYTES,
  uniqueComponentKinds,
} from "@/lib/certificates/report-file";
import { clientIp, rateLimitResponse, takeRateLimit } from "@/lib/http/rate-limit";
import { getCurrentIssuer } from "@/lib/issuers/current-issuer";

export const maxDuration = 60;

const PARSE_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_PARSE_LIMIT = 8;
const ISSUER_PARSE_LIMIT = 40;

const PARSE_PROMPT = `Read this building-assessment PDF and extract the fields in the schema.

Rules:
- buildingId is the official building / cadastre / plot identifier, not a certificate number.
- postalAddress is the full street address of the building.
- countryCode is a 2-letter ISO code (FR if French or unclear).
- types lists every certificate kind this one document covers: electrical, energy, and/or planning.
- One PDF can be one, two, or all three kinds at the same time. Include only kinds the document actually covers.
- If a field is missing, return an empty string (or the smallest valid types array you can justify).`;

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  const { issuer } = await getCurrentIssuer();
  const approvedIssuer = issuer?.status === "approved";
  const limit = approvedIssuer ? ISSUER_PARSE_LIMIT : PUBLIC_PARSE_LIMIT;
  const ip = clientIp(request);
  const limited = takeRateLimit(
    `parse-report:${approvedIssuer && issuer ? `issuer:${issuer.id}` : `ip:${ip}`}`,
    limit,
    PARSE_WINDOW_MS,
  );
  if (!limited.ok) {
    return rateLimitResponse(limited.resetAt);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !isPdfFile(file)) {
    return NextResponse.json({ error: "Upload a PDF report" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The PDF is empty" }, { status: 400 });
  }
  if (file.size > MAX_REPORT_PDF_BYTES) {
    return NextResponse.json({ error: "PDF must be 12 MB or smaller" }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: geminiModel,
      output: Output.object({ schema: reportParseSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PARSE_PROMPT },
            {
              type: "file",
              data: new Uint8Array(await file.arrayBuffer()),
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    if (!output) {
      return NextResponse.json({ error: "Could not read this PDF" }, { status: 422 });
    }

    const countryCode = output.countryCode.trim().toUpperCase().slice(0, 2) || "FR";
    return NextResponse.json({
      buildingId: output.buildingId.trim(),
      postalAddress: output.postalAddress.trim(),
      countryCode,
      types: uniqueComponentKinds(output.types),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read this PDF" },
      { status: 500 },
    );
  }
}
