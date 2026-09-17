import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// "sandbox" until you flip SQUAD_ENV=live in your deployment env once Squad
// finishes KYC review — nothing else about this route changes either way.
const SQUAD_BASE_URL =
  process.env.SQUAD_ENV === "live"
    ? "https://api-d.squadco.com"
    : "https://sandbox-api-d.squadco.com";

export async function POST(req: NextRequest) {
  const secretKey = process.env.SQUAD_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Card payment isn't configured yet — use bank transfer instead." },
      { status: 503 }
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const { orderId, email, amount, name } = await req.json();

  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Our own order id doubles as Squad's transaction_ref (alphanumeric only,
  // per their docs — a UUID's hyphens are stripped) so the webhook can find
  // its way back to the right order without relying on a specific payload
  // shape for anything beyond "here's the ref you gave us."
  const transactionRef = `ex${orderId.replace(/-/g, "")}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const squadRes = await fetch(`${SQUAD_BASE_URL}/transaction/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      currency: "NGN",
      initiate_type: "inline",
      transaction_ref: transactionRef,
      customer_name: name,
      callback_url: `${siteUrl}/success`,
      payment_channels: ["card", "bank", "ussd", "transfer"],
      metadata: { order_id: orderId },
    }),
  });

  const squadJson = await squadRes.json().catch(() => null);

  if (!squadRes.ok || !squadJson?.data?.checkout_url) {
    return NextResponse.json(
      { error: squadJson?.message ?? "Could not start card payment — try bank transfer instead." },
      { status: 502 }
    );
  }

  // Best-effort — if this write fails the payment can still go through, but
  // the webhook won't be able to match it back to an order automatically.
  await supabaseAdmin
    .from("orders")
    .update({ payment_method: "squad", gateway_reference: transactionRef })
    .eq("id", orderId);

  return NextResponse.json({ checkout_url: squadJson.data.checkout_url });
}
