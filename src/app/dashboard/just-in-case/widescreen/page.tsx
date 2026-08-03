import { auth } from "@/lib/auth";
import { JustInCaseLandscape } from "@/components/just-in-case/JustInCaseLandscape";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case 16:9 · Dom the Don",
  description: "Admin-only widescreen Just in Case sit-down game with OBS overlays",
};

export default async function JustInCaseWidescreenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <JustInCaseLandscape />;
}
