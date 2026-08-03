import { NextResponse } from "next/server";
import {
  buildJustInCaseOverlayPaths,
  createPublicJustInCaseRoom,
  ensurePublicJustInCaseRoom,
  justInCaseRoomExists,
} from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const requested = body.token?.trim();

  if (requested) {
    if (await justInCaseRoomExists(requested)) {
      return NextResponse.json({
        token: requested,
        overlays: buildJustInCaseOverlayPaths(requested),
      });
    }
    const token = ensurePublicJustInCaseRoom(requested);
    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    return NextResponse.json({
      token,
      overlays: buildJustInCaseOverlayPaths(token),
    });
  }

  const token = createPublicJustInCaseRoom();
  return NextResponse.json({
    token,
    overlays: buildJustInCaseOverlayPaths(token),
  });
}
