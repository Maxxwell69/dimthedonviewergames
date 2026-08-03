import { NextResponse } from "next/server";
import {
  getJustInCaseState,
  justInCaseRoomExists,
} from "@/lib/just-in-case-sync";

type Params = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!(await justInCaseRoomExists(token))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    token,
    state: getJustInCaseState(token),
  });
}
