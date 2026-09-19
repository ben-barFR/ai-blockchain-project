import { NextResponse } from "next/server";
import { recoverMessageAddress, type Hex } from "viem";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCertificateContract, getPublicClient, isContractConfigured } from "@/lib/ethereum/client";

export async function POST(request: Request) {
  const form = await request.formData();
  const tokenId = String(form.get("tokenId") || "");
  const issuanceId = String(form.get("issuanceId") || "");
  const component = String(form.get("component") || "") as ComponentKind;
  const contentHash = String(form.get("contentHash") || "");
  const file = form.get("file");

  if (!tokenId || !issuanceId || !COMPONENT_KINDS.includes(component)) {
    return NextResponse.json({ error: "Missing token, issuance or component" }, { status: 400 });
  }
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(contentHash)) {
    return NextResponse.json({ error: "Invalid report hash" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: issuer } = await admin
    .from("issuers")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!issuer || issuer.status !== "approved") {
    return NextResponse.json({ error: "Only approved issuers can store reports" }, { status: 403 });
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

  const path = `${tokenId}/${component}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("certificate-reports")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: rowError } = await admin.from("certificate_reports").upsert(
    {
      issuance_id: issuance.id,
      token_id: tokenId,
      component,
      storage_path: path,
      content_hash: contentHash.toLowerCase(),
      uploaded_by: user.id,
    },
    { onConflict: "issuance_id,component" },
  );
  if (rowError) {
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path, contentHash });
}

export async function PUT(request: Request) {
  if (!isContractConfigured()) {
    return NextResponse.json({ error: "Contract not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    tokenId?: string;
    component?: ComponentKind;
    signature?: Hex;
  };

  const tokenId = body.tokenId;
  const component = body.component;
  if (!tokenId || !component || !COMPONENT_KINDS.includes(component)) {
    return NextResponse.json({ error: "tokenId and component required" }, { status: 400 });
  }

  const publicClient = getPublicClient();
  const holder = await publicClient.readContract({
    ...getCertificateContract(),
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  });

  let requester: string | null = null;
  if (body.signature) {
    const message = `I request the stored report for building certificate token ${tokenId} (${component}).`;
    requester = await recoverMessageAddress({
      message,
      signature: body.signature,
    });
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in or provide a wallet signature" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", user.id)
      .maybeSingle();
    requester = profile?.wallet_address || null;
  }

  if (!requester || holder.toLowerCase() !== requester.toLowerCase()) {
    return NextResponse.json(
      { error: "This account wallet does not hold this certificate token" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("certificate_reports")
    .select("storage_path, content_hash")
    .eq("token_id", tokenId)
    .eq("component", component)
    .maybeSingle();

  if (!report) {
    const { data: issuance } = await admin
      .from("certificate_issuances")
      .select("issuers(website_url)")
      .eq("token_id", tokenId)
      .maybeSingle();
    const issuerWebsite =
      issuance && typeof issuance.issuers === "object" && issuance.issuers
        ? (issuance.issuers as { website_url?: string | null }).website_url
        : null;
    return NextResponse.json({ stored: false, issuerWebsite }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("certificate-reports")
    .createSignedUrl(report.storage_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({ stored: true, url: data.signedUrl, contentHash: report.content_hash });
}
