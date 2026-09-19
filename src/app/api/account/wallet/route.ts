import { NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { switchWalletMessage } from "@/lib/ethereum/wallet";
import { attachOwnerWalletToCustomers } from "@/lib/issuers/customers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = await ensureProfileWallet(supabase, user.id);
  await attachOwnerWalletToCustomers(createAdminClient(), {
    userId: user.id,
    email: user.email,
    walletAddress: wallet.address,
  });
  return NextResponse.json(wallet);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const wallet = await ensureProfileWallet(supabase, user.id);
  await attachOwnerWalletToCustomers(createAdminClient(), {
    userId: user.id,
    email: user.email,
    walletAddress: wallet.address,
    token: body.token,
  });
  return NextResponse.json(wallet);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { address?: string; signature?: `0x${string}` };
  if (!body.address || !body.signature || !/^0x[0-9a-fA-F]{40}$/.test(body.address)) {
    return NextResponse.json({ error: "address and signature required" }, { status: 400 });
  }

  const recovered = await recoverMessageAddress({
    message: switchWalletMessage(body.address),
    signature: body.signature,
  });
  if (recovered.toLowerCase() !== body.address.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match that wallet" }, { status: 403 });
  }

  const address = body.address.toLowerCase();
  const { error } = await supabase
    .from("profiles")
    .update({
      wallet_address: address,
      generated_wallet_key: null,
      wallet_source: "linked",
    })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const admin = createAdminClient();
  await admin.from("issuers").update({ wallet_address: address }).eq("user_id", user.id);
  await attachOwnerWalletToCustomers(admin, {
    userId: user.id,
    email: user.email,
    walletAddress: address,
  });

  return NextResponse.json({
    address,
    privateKey: null,
    source: "linked",
  });
}
