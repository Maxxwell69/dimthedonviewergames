import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDisplayWheel, spinWheel } from "@/lib/wheel-service";

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;
  const wheel = await prisma.wheel.findUnique({
    where: { displayToken: token },
  });

  if (!wheel) {
    return NextResponse.json({ error: "Display not found" }, { status: 404 });
  }

  try {
    await spinWheel(wheel.id);
    const refreshed = await prisma.wheel.findUniqueOrThrow({
      where: { id: wheel.id },
      include: {
        entries: { orderBy: { sortOrder: "asc" } },
        winners: { orderBy: { createdAt: "desc" }, take: 25 },
      },
    });
    return NextResponse.json({ wheel: serializeDisplayWheel(refreshed) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spin failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
