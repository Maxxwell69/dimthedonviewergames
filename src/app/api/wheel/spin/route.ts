import { NextResponse } from "next/server";
import { getSharedWheel, spinWheel } from "@/lib/wheel-service";

export async function POST() {
  try {
    const wheel = await getSharedWheel();
    const updated = await spinWheel(wheel.id);
    return NextResponse.json({ wheel: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spin failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
