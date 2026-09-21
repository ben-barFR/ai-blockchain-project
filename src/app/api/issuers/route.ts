import { NextResponse } from "next/server";
import { DEFAULT_ISSUANCE_CREDITS } from "@/lib/issuers/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCertificateContract,
  getPublicClient,
  isContractConfigured,
} from "@/lib/ethereum/client";
import { getMinterClient } from "@/lib/ethereum/minter";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    companyName?: string;
    countryCode?: string;
    companyIdentifier?: string;
    websiteUrl?: string;
    accreditationNumber?: string;
    accreditationUrl?: string;
  };

  const companyName = (body.companyName || "").trim();
  const accreditationNumber = (body.accreditationNumber || body.accreditationUrl || "").trim();
  if (accreditationNumber && !/^[0-9]+$/.test(accreditationNumber)) {
    return NextResponse.json({ error: "Accreditation number must be digits only" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", user.id)
    .maybeSingle();
  const walletAddress = (profile?.wallet_address || "").trim();

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("issuers")
    .select("issuance_credits, country_code, company_identifier")
    .eq("user_id", user.id)
    .maybeSingle();

  // Country + official identifier map the company to the wallet on certificates;
  // once registered they cannot be changed from the client.
  const countryCode = (
    existing?.country_code ||
    body.countryCode ||
    ""
  )
    .trim()
    .toUpperCase();
  const companyIdentifier = (
    existing?.company_identifier ||
    body.companyIdentifier ||
    ""
  ).trim();

  if (!companyName || !countryCode || !companyIdentifier || !walletAddress) {
    return NextResponse.json({ error: "Missing required issuer fields or account wallet" }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Wallet address must be a valid 0x address" }, { status: 400 });
  }

  let onchainApproved = false;
  if (isContractConfigured()) {
    try {
      const wallet = getMinterClient();
      const publicClient = getPublicClient();
      const hash = await wallet.writeContract({
        ...getCertificateContract(),
        functionName: "setApprovedIssuer",
        args: [walletAddress as `0x${string}`, true],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      onchainApproved = true;
    } catch {
      onchainApproved = false;
    }
  }

  const { data, error } = await admin
    .from("issuers")
    .upsert(
      {
        user_id: user.id,
        company_name: companyName,
        country_code: countryCode,
        company_identifier: companyIdentifier,
        website_url: body.websiteUrl?.trim() || null,
        accreditation_url: accreditationNumber || null,
        wallet_address: walletAddress.toLowerCase(),
        status: "approved",
        review_notes: "Auto-approved",
        reviewed_at: new Date().toISOString(),
        onchain_approved: onchainApproved,
        issuance_credits: existing?.issuance_credits ?? DEFAULT_ISSUANCE_CREDITS,
      },
      { onConflict: "user_id" },
    )
    .select("id, status, onchain_approved")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, issuer: data });
}
