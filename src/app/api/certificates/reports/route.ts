import { NextResponse } from "next/server";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import { hashFile } from "@/lib/certificates/hash";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";

export async function POST(request: Request) {
  const form = await request.formData();
  const tokenId = String(form.get("tokenId") || "");
  const issuanceId = String(form.get("issuanceId") || "");
  const component = String(form.get("component") || "") as ComponentKind;
  const contentHash = String(form.get("contentHash") || "");
  const file = form.get("file");

  if (!tokenId || !issuanceId || !COMPONENT_KINDS.includes(component)) {
    return NextResponse.json({ error: "Missing certificate, issuance or component" }, { status: 400 });
  }
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(contentHash)) {
    return NextResponse.json({ error: "Invalid report hash" }, { status: 400 });
  }

  const { user, issuer, error, status, admin } = await requireApprovedIssuer();
  if (error || !issuer || !admin || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status });
  }

  const { data: issuance } = await admin
    .from("certificate_issuances")
    .select("id, issuer_id, token_id")
    .eq("id", issuanceId)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!issuance) {
    return NextResponse.json({ error: "Issuance not found" }, { status: 404 });
  }
  if (issuance.token_id && issuance.token_id !== tokenId) {
    return NextResponse.json({ error: "Certificate ID does not match this issuance" }, { status: 400 });
  }

  const actualHash = (await hashFile(file)).toLowerCase();
  if (actualHash !== contentHash.toLowerCase()) {
    return NextResponse.json(
      { error: "The uploaded PDF does not match the hash written on the certificate" },
      { status: 400 },
    );
  }

  const storedTokenId = issuance.token_id || tokenId;
  const path = `${storedTokenId}/${component}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("certificate-reports")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: rowError } = await admin.from("certificate_reports").upsert(
    {
      issuance_id: issuance.id,
      token_id: storedTokenId,
      component,
      storage_path: path,
      content_hash: actualHash,
      uploaded_by: user.id,
    },
    { onConflict: "issuance_id,component" },
  );
  if (rowError) {
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path, contentHash: actualHash });
}
