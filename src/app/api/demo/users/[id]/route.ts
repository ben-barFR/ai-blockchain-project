import { NextResponse } from "next/server";
import { deletePlatformAccount } from "@/lib/demo/accounts";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }

  try {
    const archived = await deletePlatformAccount(id);
    return NextResponse.json({
      ok: true,
      deleted: {
        email: archived.email,
        fullName: archived.full_name,
        userType: archived.user_type,
        walletAddresses: archived.wallet_addresses,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete account";
    const status = message === "User not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
