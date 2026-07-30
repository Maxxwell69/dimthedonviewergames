import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeDisplayWheel } from "@/lib/wheel-service";
import { DisplayClient } from "@/components/DisplayClient";

type Props = { params: Promise<{ token: string }> };

export default async function DisplayPage({ params }: Props) {
  const { token } = await params;
  const wheel = await prisma.wheel.findUnique({
    where: { displayToken: token },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  if (!wheel) notFound();

  return (
    <Suspense fallback={<div className="display-shell" />}>
      <DisplayClient token={token} initialWheel={serializeDisplayWheel(wheel)} />
    </Suspense>
  );
}
