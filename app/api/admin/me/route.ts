import { NextRequest, NextResponse } from "next/server";
import { getRequestingAdmin } from "../../../../lib/verifyAdmin";

/**
 * Returns the caller's own admin row (role + email), verified server-side
 * with the service-role client — which bypasses RLS entirely. This exists
 * because the post-login "am I an admin" check must not depend on the
 * client's RLS-gated read of `admins` succeeding; if that policy is ever
 * misconfigured, this route stays authoritative.
 */
export async function GET(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  return NextResponse.json({ admin: requester.admin });
}
