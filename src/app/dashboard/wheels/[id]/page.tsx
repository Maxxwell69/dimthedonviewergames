import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWheelForUser, serializeWheel } from "@/lib/wheel-service";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function WheelEditorPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const wheel = await getWheelForUser(session.user.id, id);
  if (!wheel) notFound();

  return <DashboardClient initialWheel={serializeWheel(wheel)} />;
}
