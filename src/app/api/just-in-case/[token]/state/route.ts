import { NextResponse } from "next/server";
import {
  ensurePublicJustInCaseRoom,
  isValidJustInCaseState,
  justInCaseRoomExists,
  setJustInCaseState,
} from "@/lib/just-in-case-sync";

type Params = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: Params) {
  const { token } = await params;
  if (!(await justInCaseRoomExists(token))) {
    if (!(await ensurePublicJustInCaseRoom(token))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!isValidJustInCaseState(body)) {
    return NextResponse.json({ error: "Invalid game state" }, { status: 400 });
  }

  const updatedAt = await setJustInCaseState(token, body);
  return NextResponse.json({ ok: true, token, updatedAt });
}
