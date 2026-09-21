import { NextResponse } from "next/server";
import { isAddress, parseEventLogs, zeroHash, type Hex } from "viem";
import { COMPONENT_INDEX, COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { certificateAbi } from "@/lib/ethereum/abi";
import {
  getCertificateContract,
  getContractAddress,
  getPublicClient,
  isContractConfigured,
} from "@/lib/ethereum/client";
import { getMinterClient } from "@/lib/ethereum/minter";
import { isWalletAddress, normalizeWallet } from "@/lib/issuers/customers";

function asHash(value: unknown): Hex {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)) {
    return value as Hex;
  }
  return zeroHash;
}

export async function POST(request: Request) {
  if (!isContractConfigured()) {
    return NextResponse.json(
      { error: "Certificate contract is not configured" },
      { status: 503 },
    );
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
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!issuer || issuer.status !== "approved") {
    return NextResponse.json(
      { error: "Issuer is not approved yet" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    customerId?: string;
    customerBuildingId?: string;
    components?: ComponentKind[];
    hashes?: Partial<Record<ComponentKind, string>>;
  };

  const customerId = (body.customerId || "").trim();
  if (!customerId) {
    return NextResponse.json({ error: "Select a customer to receive this certificate" }, { status: 400 });
  }

  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, wallet_address")
    .eq("id", customerId)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (!customer.wallet_address || !isWalletAddress(customer.wallet_address)) {
    return NextResponse.json(
      { error: "This customer has no destination wallet yet. Send them the onboarding link first." },
      { status: 409 },
    );
  }
  const customerWallet = normalizeWallet(customer.wallet_address) as `0x${string}`;

  const customerBuildingId = (body.customerBuildingId || "").trim();
  if (!customerBuildingId) {
    return NextResponse.json({ error: "Select a building for this certificate" }, { status: 400 });
  }

  const { data: building } = await admin
    .from("customer_buildings")
    .select("id, building_identifier, postal_address, country_code, archived_at, customer_id")
    .eq("id", customerBuildingId)
    .eq("issuer_id", issuer.id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }
  if (building.archived_at) {
    return NextResponse.json(
      { error: "This building is archived. Create a new building for new certificates." },
      { status: 409 },
    );
  }

  const buildingId = (building.building_identifier || "").trim();
  const countryCode = (building.country_code || "").trim().toUpperCase();
  const postalAddress = (building.postal_address || "").trim();
  const selected = new Set(
    (body.components || []).filter((kind): kind is ComponentKind =>
      COMPONENT_KINDS.includes(kind),
    ),
  );

  if (!countryCode || (!buildingId && !postalAddress)) {
    return NextResponse.json(
      { error: "This building is missing an ID or postal address" },
      { status: 400 },
    );
  }
  if (selected.size === 0) {
    return NextResponse.json({ error: "Select at least one certificate type" }, { status: 400 });
  }
  const hashes = body.hashes || {};
  for (const kind of selected) {
    if (asHash(hashes[kind]) === zeroHash) {
      return NextResponse.json(
        { error: "Upload a PDF report. Its hash is required for every selected type." },
        { status: 400 },
      );
    }
  }
  if (!isAddress(issuer.wallet_address)) {
    return NextResponse.json({ error: "Issuer wallet is invalid" }, { status: 400 });
  }

  const { data: reserved, error: creditError } = await admin
    .from("issuers")
    .update({ issuance_credits: issuer.issuance_credits - 1 })
    .eq("id", issuer.id)
    .eq("status", "approved")
    .eq("issuance_credits", issuer.issuance_credits)
    .gt("issuance_credits", 0)
    .select("issuance_credits")
    .maybeSingle();

  if (creditError) {
    return NextResponse.json({ error: creditError.message }, { status: 500 });
  }
  if (!reserved) {
    return NextResponse.json(
      { error: "No issuance credits remaining. Top up your fiat account to continue." },
      { status: 402 },
    );
  }

  const publicClient = getPublicClient();
  const contract = getCertificateContract();
  const approved = await publicClient.readContract({
    ...contract,
    functionName: "approvedIssuers",
    args: [issuer.wallet_address],
  });

  if (!approved) {
    await admin
      .from("issuers")
      .update({ issuance_credits: reserved.issuance_credits + 1 })
      .eq("id", issuer.id);
    return NextResponse.json(
      { error: "Issuer wallet is not approved on-chain yet" },
      { status: 403 },
    );
  }

  const wallet = getMinterClient();
  let hash: `0x${string}`;
  try {
    hash = await wallet.writeContract({
      address: getContractAddress(),
      abi: certificateAbi,
      functionName: "issueCertificate",
      args: [
        issuer.wallet_address,
        customerWallet,
        buildingId,
        countryCode,
        postalAddress,
        issuer.company_identifier,
        "",
        selected.has("electrical"),
        selected.has("energy"),
        selected.has("planning"),
        asHash(hashes.electrical),
        asHash(hashes.energy),
        asHash(hashes.planning),
      ],
    });
  } catch (err) {
    await admin
      .from("issuers")
      .update({ issuance_credits: reserved.issuance_credits + 1 })
      .eq("id", issuer.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mint failed" },
      { status: 500 },
    );
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const issuedLogs = parseEventLogs({
    abi: certificateAbi,
    eventName: "CertificateIssued",
    logs: receipt.logs,
  });
  const tokenId = issuedLogs[0]?.args.tokenId?.toString() ?? null;

  const { data: issuance, error } = await admin
    .from("certificate_issuances")
    .insert({
      issuer_id: issuer.id,
      token_id: tokenId,
      tx_hash: hash,
      building_id: buildingId,
      country_code: countryCode,
      postal_address: postalAddress,
      has_electrical: selected.has("electrical"),
      has_energy: selected.has("energy"),
      has_planning: selected.has("planning"),
      status: "minted",
      customer_id: customer.id,
      customer_building_id: building.id,
    })
    .select("id, token_id, tx_hash")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, txHash: hash, tokenId }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    issuanceId: issuance.id,
    tokenId: issuance.token_id || tokenId,
    txHash: hash,
    customerWallet,
    issuanceCredits: reserved.issuance_credits,
    componentIndex: COMPONENT_INDEX,
  });
}
