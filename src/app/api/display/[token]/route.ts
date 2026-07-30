import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDisplayWheel } from "@/lib/wheel-service";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const wheel = await prisma.wheel.findUnique({
    where: { displayToken: token },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  if (!wheel) {
    return NextResponse.json({ error: "Display not found" }, { status: 404 });
  }

  // Recover stuck spins if process restarted
  if (
    wheel.isSpinning &&
    wheel.spinEndsAt &&
    wheel.spinEndsAt.getTime() <= Date.now()
  ) {
    const { finalizeSpin } = await import("@/lib/wheel-service");
    const finalized = await finalizeSpin(wheel.id);
    if (finalized) {
      return NextResponse.json({ wheel: finalized });
    }
  }

  return NextResponse.json({ wheel: serializeDisplayWheel(wheel) });
}
