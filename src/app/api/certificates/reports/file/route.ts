import { NextResponse } from "next/server";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCertificateContract, getPublicClient, isContractConfigured } from "@/lib/ethereum/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = (searchParams.get("tokenId") || "").trim();
  const issuanceId = (searchParams.get("issuanceId") || "").trim();
  const component = (searchParams.get("component") || "") as ComponentKind;

  if (!COMPONENT_KINDS.includes(component)) {
    return NextResponse.json({ error: "Certificate type required" }, { status: 400 });
  }
  if (!tokenId && !issuanceId) {
    return NextResponse.json({ error: "Certificate or issuance required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let reportQuery = admin
    .from("certificate_reports")
    .select("storage_path, token_id, issuance_id, component")
    .eq("component", component);
  if (issuanceId) reportQuery = reportQuery.eq("issuance_id", issuanceId);
  if (tokenId) reportQuery = reportQuery.eq("token_id", tokenId);

  const { data: report } = await reportQuery.maybeSingle();
  if (!report) {
    return NextResponse.json({ error: "No PDF stored for this certificate" }, { status: 404 });
  }

  const { data: issuance } = await admin
    .from("certificate_issuances")
    .select("id, issuer_id, token_id")
    .eq("id", report.issuance_id)
    .maybeSingle();

  const { data: issuer } = await admin
    .from("issuers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isIssuer = Boolean(issuer && issuance && issuer.id === issuance.issuer_id);

  let isHolder = false;
  const reportTokenId = report.token_id || tokenId;
  if (!isIssuer && isContractConfigured() && reportTokenId) {
    const holder = await getPublicClient().readContract({
      ...getCertificateContract(),
      functionName: "ownerOf",
      args: [BigInt(reportTokenId)],
    });
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", user.id)
      .maybeSingle();
    isHolder = Boolean(
      profile?.wallet_address && holder.toLowerCase() === profile.wallet_address.toLowerCase(),
    );
  }

  if (!isIssuer && !isHolder) {
    return NextResponse.json({ error: "Not allowed to open this PDF" }, { status: 403 });
  }

  const { data, error } = await admin.storage
    .from("certificate-reports")
    .createSignedUrl(report.storage_path, 120);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not open PDF" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
