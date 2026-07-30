import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createWheelForUser,
  listWheelsForUser,
  serializeWheel,
} from "@/lib/wheel-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wheels = await listWheelsForUser(session.user.id);
  return NextResponse.json({ wheels });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
  };

  const wheel = await createWheelForUser(session.user.id, {
    title: body.title,
    description: body.description,
  });

  return NextResponse.json({ wheel: serializeWheel(wheel) }, { status: 201 });
}
