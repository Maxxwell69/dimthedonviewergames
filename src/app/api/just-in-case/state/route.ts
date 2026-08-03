import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOrCreateJustInCaseToken,
  isValidJustInCaseState,
  setJustInCaseState,
} from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!isValidJustInCaseState(body)) {
    return NextResponse.json({ error: "Invalid game state" }, { status: 400 });
  }

  const token = await getOrCreateJustInCaseToken(session.user.id);
  setJustInCaseState(token, body);
  return NextResponse.json({ ok: true, token });
}
