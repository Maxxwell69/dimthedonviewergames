import { auth } from "@/lib/auth";
import { getOrCreateJustInCaseToken } from "@/lib/just-in-case-sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vault Just in Case 16:9 · Dom the Don",
  description: "Widescreen Vault banker template",
};

export default async function VaultWidescreenDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const token = await getOrCreateJustInCaseToken(session.user.id);
  redirect(`/just-in-case/${token}/vault/widescreen`);
}
