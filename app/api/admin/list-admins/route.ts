import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getRequestingAdmin } from "../../../../lib/verifyAdmin";

export async function GET(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  if (requester.admin.role !== "god") {
    return NextResponse.json({ error: "Only the god account can view admins" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin!
    .from("admins")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ admins: data });
}
