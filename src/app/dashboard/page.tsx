import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateWheelForUser, serializeWheel } from "@/lib/wheel-service";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const wheel = await getOrCreateWheelForUser(session.user.id);

  return (
    <DashboardClient
      initialWheel={serializeWheel(wheel)}
      userEmail={session.user.email}
    />
  );
}
