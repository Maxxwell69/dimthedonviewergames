import { auth } from "@/lib/auth";
import { JustInCaseSizeChooser } from "@/components/just-in-case/JustInCaseSizeChooser";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case · Choose template",
  description: "Choose Dom or Vault, then 16:9 or 9:16",
};

export default async function JustInCaseChooserPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <JustInCaseSizeChooser />;
}
