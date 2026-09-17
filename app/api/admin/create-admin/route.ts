import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getRequestingAdmin } from "../../../../lib/verifyAdmin";

export async function POST(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  // Only "god" can create new admins — a plain admin creating another admin
  // (or itself, via a forged role field) would be a privilege escalation.
  if (requester.admin.role !== "god") {
    return NextResponse.json({ error: "Only the god account can add admins" }, { status: 403 });
  }

  const { email, password } = await req.json();

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: created, error: createErr } = await supabaseAdmin!.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 400 });
  }

  // role is always "admin" here — a "god" account can only be created by
  // hand in the Supabase dashboard + one SQL statement (see supabase/schema.sql).
  const { error: insertErr } = await supabaseAdmin!.from("admins").insert({
    id: created.user.id,
    email,
    role: "admin",
  });

  if (insertErr) {
    // Roll back the auth user so we don't leave an orphaned account with no admins row.
    await supabaseAdmin!.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, email });
}
