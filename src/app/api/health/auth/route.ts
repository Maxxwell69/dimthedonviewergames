import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authUrlLooksValid(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Safe diagnostics — never returns secret values. */
export async function GET() {
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || null;
  const hasScheme = Boolean(authUrl && /^https?:\/\//i.test(authUrl));
  const secretOk = Boolean(authSecret && authSecret.length >= 16);
  const urlOk = authUrlLooksValid(authUrl);

  return NextResponse.json({
    ok: secretOk && urlOk,
    hasAuthSecret: secretOk,
    authSecretLength: authSecret?.length ?? 0,
    hasAuthUrl: Boolean(authUrl),
    authUrlHasScheme: hasScheme,
    authUrlValid: urlOk,
    authUrl,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    trustHost: process.env.AUTH_TRUST_HOST === "true" || true,
  });
}
