import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteWheelForUser,
  getWheelForUser,
  serializeWheel,
  updateWheelSettings,
} from "@/lib/wheel-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const wheel = await getWheelForUser(session.user.id, id);
  if (!wheel) return NextResponse.json({ error: "Wheel not found" }, { status: 404 });
  return NextResponse.json({ wheel: serializeWheel(wheel) });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getWheelForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Wheel not found" }, { status: 404 });

  const body = await req.json();
  const wheel = await updateWheelSettings(id, {
    title: typeof body.title === "string" ? body.title : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    removeOnWin: typeof body.removeOnWin === "boolean" ? body.removeOnWin : undefined,
    spinDurationMs:
      typeof body.spinDurationMs === "number" ? body.spinDurationMs : undefined,
    soundEnabled: typeof body.soundEnabled === "boolean" ? body.soundEnabled : undefined,
    celebrateEnabled:
      typeof body.celebrateEnabled === "boolean" ? body.celebrateEnabled : undefined,
    spinVolume: typeof body.spinVolume === "number" ? body.spinVolume : undefined,
    celebrateVolume:
      typeof body.celebrateVolume === "number" ? body.celebrateVolume : undefined,
    allowDuplicates:
      typeof body.allowDuplicates === "boolean" ? body.allowDuplicates : undefined,
    colorPrimary: typeof body.colorPrimary === "string" ? body.colorPrimary : undefined,
    colorSecondary:
      typeof body.colorSecondary === "string" ? body.colorSecondary : undefined,
    colorAccent: typeof body.colorAccent === "string" ? body.colorAccent : undefined,
    hubImageUrl:
      body.hubImageUrl === null
        ? null
        : typeof body.hubImageUrl === "string"
          ? body.hubImageUrl
          : undefined,
    entriesText: typeof body.entriesText === "string" ? body.entriesText : undefined,
  });

  return NextResponse.json({ wheel });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteWheelForUser(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
