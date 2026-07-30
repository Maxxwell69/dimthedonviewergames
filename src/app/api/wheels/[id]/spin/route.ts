import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWheelForUser, spinWheel } from "@/lib/wheel-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getWheelForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Wheel not found" }, { status: 404 });

  try {
    const updated = await spinWheel(id);
    return NextResponse.json({ wheel: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spin failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
