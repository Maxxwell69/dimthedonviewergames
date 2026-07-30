import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Safe diagnostics — never returns secret values. */
export async function GET() {
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return NextResponse.json({
    ok: Boolean(authSecret && authSecret.length >= 16),
    hasAuthSecret: Boolean(authSecret && authSecret.length >= 16),
    authSecretLength: authSecret?.length ?? 0,
    hasAuthUrl: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL),
    authUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL || null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    trustHost: process.env.AUTH_TRUST_HOST === "true" || true,
  });
}
