import { auth } from "@/lib/auth";
import { JustInCaseGame } from "@/components/just-in-case/JustInCaseGame";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case · Dom the Don",
  description: "Admin-only Deal or No Deal style sit-down game",
};

export default async function JustInCasePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <JustInCaseGame />;
}
