import "server-only";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

type AdminRow = { id: string; email: string; role: "god" | "admin" };

/**
 * Verifies the bearer token on an incoming request against Supabase Auth,
 * then confirms the user has a row in `admins`. Every /api/admin/* route
 * must call this before doing anything — the service-role client bypasses
 * RLS, so this check is the only thing standing between an arbitrary caller
 * and the admin API.
 */
export async function getRequestingAdmin(
  req: NextRequest
): Promise<{ admin: AdminRow } | { error: string; status: number }> {
  if (!supabaseAdmin) {
    return { error: "Supabase admin client is not configured on the server.", status: 500 };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: "Missing bearer token", status: 401 };
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user) {
    return { error: "Invalid or expired session", status: 401 };
  }

  const { data: adminRow, error: adminErr } = await supabaseAdmin
    .from("admins")
    .select("id, email, role")
    .eq("id", userData.user.id)
    .single();

  if (adminErr || !adminRow) {
    return { error: "Not an admin", status: 403 };
  }

  return { admin: adminRow as AdminRow };
}
