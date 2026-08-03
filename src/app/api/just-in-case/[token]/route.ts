import { NextResponse } from "next/server";
import {
  getJustInCaseSnapshot,
  justInCaseRoomExists,
} from "@/lib/just-in-case-sync";

type Params = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!(await justInCaseRoomExists(token))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = await getJustInCaseSnapshot(token);
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
