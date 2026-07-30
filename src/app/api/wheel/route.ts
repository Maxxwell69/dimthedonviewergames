import { NextResponse } from "next/server";
import { getSharedWheel, serializeWheel, updateWheelSettings } from "@/lib/wheel-service";

export async function GET() {
  const wheel = await getSharedWheel();
  return NextResponse.json({ wheel: serializeWheel(wheel) });
}

export async function PATCH(req: Request) {
  const wheel = await getSharedWheel();
  const body = await req.json();

  const updated = await updateWheelSettings(wheel.id, {
    title: typeof body.title === "string" ? body.title : undefined,
    removeOnWin: typeof body.removeOnWin === "boolean" ? body.removeOnWin : undefined,
    spinDurationMs:
      typeof body.spinDurationMs === "number" ? body.spinDurationMs : undefined,
    soundEnabled: typeof body.soundEnabled === "boolean" ? body.soundEnabled : undefined,
    allowDuplicates:
      typeof body.allowDuplicates === "boolean" ? body.allowDuplicates : undefined,
    entriesText: typeof body.entriesText === "string" ? body.entriesText : undefined,
  });

  return NextResponse.json({ wheel: updated });
}
