import { getSharedWheel, serializeWheel } from "@/lib/wheel-service";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const wheel = await getSharedWheel();

  return <DashboardClient initialWheel={serializeWheel(wheel)} />;
}
