import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateWheelForUser, spinWheel } from "@/lib/wheel-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wheel = await getOrCreateWheelForUser(session.user.id);
    const updated = await spinWheel(wheel.id);
    return NextResponse.json({ wheel: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spin failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
