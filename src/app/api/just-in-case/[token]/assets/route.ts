import { NextResponse } from "next/server";
import {
  ensurePublicJustInCaseRoom,
  getJustInCaseAssetsMeta,
  isValidJustInCaseZoneAssetsPayload,
  justInCaseRoomExists,
  setJustInCaseThemeAssets,
} from "@/lib/just-in-case-sync";

type Params = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!(await justInCaseRoomExists(token))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Meta only — full data URLs are served via /media/[theme]/[slot] for OBS/TikTok.
  const snapshot = await getJustInCaseAssetsMeta(token);
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function PUT(req: Request, { params }: Params) {
  const { token } = await params;
  if (!(await justInCaseRoomExists(token))) {
    if (!(await ensurePublicJustInCaseRoom(token))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const body = (await req.json().catch(() => null)) as {
    theme?: string;
    zone?: unknown;
  } | null;

  const theme = body?.theme === "vault" ? "vault" : body?.theme === "dom" ? "dom" : null;
  if (!theme || !isValidJustInCaseZoneAssetsPayload(body?.zone)) {
    return NextResponse.json({ error: "Invalid zone assets" }, { status: 400 });
  }

  const updated = await setJustInCaseThemeAssets(token, theme, body.zone);
  return NextResponse.json({ ok: true, token, ...updated });
}
