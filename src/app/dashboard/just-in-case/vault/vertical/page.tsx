import { auth } from "@/lib/auth";
import { getOrCreateJustInCaseToken } from "@/lib/just-in-case-sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vault Just in Case 9:16 · Dom the Don",
  description: "Vertical Vault banker template",
};

export default async function VaultVerticalDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const token = await getOrCreateJustInCaseToken(session.user.id);
  redirect(`/just-in-case/${token}/vault/vertical`);
}
