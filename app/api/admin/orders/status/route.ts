import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getRequestingAdmin } from "../../../../../lib/verifyAdmin";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled"];

export async function POST(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  const { id, status } = await req.json();
  if (typeof id !== "string" || !id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid order id or status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin!.from("orders").update({ status }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
