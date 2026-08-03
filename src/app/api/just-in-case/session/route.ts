import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildJustInCaseOverlayPaths,
  getOrCreateJustInCaseToken,
  rotateJustInCaseToken,
} from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getOrCreateJustInCaseToken(session.user.id);
  return NextResponse.json({
    token,
    overlays: buildJustInCaseOverlayPaths(token),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { rotate?: boolean };
  const token = body.rotate
    ? await rotateJustInCaseToken(session.user.id)
    : await getOrCreateJustInCaseToken(session.user.id);

  return NextResponse.json({
    token,
    overlays: buildJustInCaseOverlayPaths(token),
  });
}
