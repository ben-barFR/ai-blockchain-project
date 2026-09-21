import { NextResponse } from "next/server";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; buildingId: string }> },
) {
  const { issuer, error, status } = await requireApprovedIssuer();
  if (error || !issuer) {
    return NextResponse.json({ error }, { status });
  }

  const { id, buildingId } = await params;
  const body = (await request.json()) as { archived?: boolean };
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("customer_buildings")
    .select("id")
    .eq("id", buildingId)
    .eq("customer_id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  const { data, error: updateError } = await admin
    .from("customer_buildings")
    .update({ archived_at: body.archived === false ? null : new Date().toISOString() })
    .eq("id", buildingId)
    .select(
      "id, issuer_id, customer_id, building_identifier, postal_address, country_code, archived_at, created_at",
    )
    .single();

  if (updateError || !data) {
    return NextResponse.json({ error: updateError?.message || "Could not archive building" }, { status: 400 });
  }

  return NextResponse.json({ building: data });
}
