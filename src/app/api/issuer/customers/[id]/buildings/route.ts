import { NextResponse } from "next/server";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

async function loadCustomer(issuerId: string, customerId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("issuer_customers")
    .select("id")
    .eq("id", customerId)
    .eq("issuer_id", issuerId)
    .maybeSingle();
  return data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { issuer, error, status } = await requireApprovedIssuer();
  if (error || !issuer) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;
  const customer = await loadCustomer(issuer.id, id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error: queryError } = await admin
    .from("customer_buildings")
    .select(
      "id, issuer_id, customer_id, building_identifier, postal_address, country_code, archived_at, created_at, certificate_issuances!customer_building_id(id, token_id)",
    )
    .eq("issuer_id", issuer.id)
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({ buildings: data || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { issuer, error, status } = await requireApprovedIssuer();
  if (error || !issuer) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;
  const customer = await loadCustomer(issuer.id, id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    buildingIdentifier?: string;
    postalAddress?: string;
    countryCode?: string;
  };

  const buildingIdentifier = (body.buildingIdentifier || "").trim();
  const postalAddress = (body.postalAddress || "").trim();
  const countryCode = (body.countryCode || "").trim().toUpperCase();

  if (!countryCode || (!buildingIdentifier && !postalAddress)) {
    return NextResponse.json(
      { error: "Country and a building ID or postal address are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("customer_buildings")
    .insert({
      issuer_id: issuer.id,
      customer_id: id,
      building_identifier: buildingIdentifier,
      postal_address: postalAddress,
      country_code: countryCode,
    })
    .select(
      "id, issuer_id, customer_id, building_identifier, postal_address, country_code, archived_at, created_at",
    )
    .single();

  if (insertError || !data) {
    return NextResponse.json({ error: insertError?.message || "Could not add building" }, { status: 400 });
  }

  return NextResponse.json({ building: data });
}
