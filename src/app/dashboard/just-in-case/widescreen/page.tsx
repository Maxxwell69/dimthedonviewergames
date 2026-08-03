import { auth } from "@/lib/auth";
import { getOrCreateJustInCaseToken } from "@/lib/just-in-case-sync";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case 16:9 · Dom the Don",
  description: "Widescreen Just in Case",
};

export default async function JustInCaseWidescreenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const token = await getOrCreateJustInCaseToken(session.user.id);
  // Always land on the public URL so TikTok/OBS never see /dashboard (login wall).
  redirect(`/just-in-case/${token}/widescreen`);
}
