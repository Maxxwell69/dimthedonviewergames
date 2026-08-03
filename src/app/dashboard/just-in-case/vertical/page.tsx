import { auth } from "@/lib/auth";
import { JustInCasePortrait } from "@/components/just-in-case/JustInCasePortrait";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case 9:16 Host · Dom the Don",
  description: "Operator host for vertical Just in Case",
};

export default async function JustInCaseVerticalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <JustInCasePortrait mode="host" />;
}
