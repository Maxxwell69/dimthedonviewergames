import { auth } from "@/lib/auth";
import { listWheelsForUser } from "@/lib/wheel-service";
import { WheelsHomeClient } from "@/components/WheelsHomeClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const wheels = await listWheelsForUser(session.user.id);

  return (
    <WheelsHomeClient
      initialWheels={wheels}
      userName={session.user.name || session.user.email || "Operator"}
      userEmail={session.user.email || ""}
    />
  );
}
