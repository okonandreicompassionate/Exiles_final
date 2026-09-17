import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getRequestingAdmin } from "../../../../lib/verifyAdmin";

export async function POST(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  if (requester.admin.role !== "god") {
    return NextResponse.json({ error: "Only the god account can remove admins" }, { status: 403 });
  }

  const { id } = await req.json();
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Admin id is required" }, { status: 400 });
  }

  if (id === requester.admin.id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin!.from("admins").select("role").eq("id", id).single();
  if (target?.role === "god") {
    return NextResponse.json({ error: "Can't remove a god account from here" }, { status: 400 });
  }

  const { error: deleteRowErr } = await supabaseAdmin!.from("admins").delete().eq("id", id);
  if (deleteRowErr) {
    return NextResponse.json({ error: deleteRowErr.message }, { status: 400 });
  }

  // Also deactivate their login entirely, not just their admin privileges.
  await supabaseAdmin!.auth.admin.deleteUser(id);

  return NextResponse.json({ success: true });
}
