import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

/**
 * Squad signs webhooks with HMAC-SHA512 of the raw request body, using your
 * secret key, sent back in a header. Public docs disagree on the exact
 * header name across API versions (x-squad-encrypted-body vs
 * x-squad-signature) — this checks both. Squad's own docs note sandbox
 * doesn't send a signature at all, so we only hard-require a match in live
 * mode; in sandbox a missing/unmatched signature just logs a warning.
 *
 * VERIFY THIS against a real test webhook from your Squad dashboard once
 * KYC clears — field names here (transaction_ref, status) are the
 * publicly-documented shape but Squad's dashboard lets you send a live test
 * event, which is worth doing before relying on this in production.
 */
function isValidSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex").toUpperCase();
  return header.toUpperCase() === expected;
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.SQUAD_SECRET_KEY;
  if (!secretKey || !supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-squad-encrypted-body") ?? req.headers.get("x-squad-signature");

  const isLive = process.env.SQUAD_ENV === "live";
  const signatureOk = isValidSignature(rawBody, signature, secretKey);

  if (isLive && !signatureOk) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (!signatureOk) {
    console.warn("Squad webhook: signature missing/unverified (expected in sandbox)");
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = (body?.data as Record<string, unknown>) ?? body;
  const transactionRef = (data?.transaction_ref ?? data?.transaction_reference) as string | undefined;
  const status = ((data?.transaction_status ?? data?.status ?? "") as string).toLowerCase();

  if (!transactionRef) {
    return NextResponse.json({ received: true });
  }

  if (status && status !== "success" && status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: "paid" })
    .eq("gateway_reference", transactionRef)
    .eq("status", "pending");

  if (error) {
    console.error("Squad webhook: failed to update order:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
