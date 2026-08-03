import { JustInCasePortrait } from "@/components/just-in-case/JustInCasePortrait";
import { getJustInCaseOwner } from "@/lib/just-in-case-sync";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata = {
  title: "Just in Case Overlay · 9:16",
  description: "Public OBS overlay for Just in Case vertical",
};

export default async function PublicJustInCaseVerticalPage({ params }: Props) {
  const { token } = await params;
  const owner = await getJustInCaseOwner(token);
  if (!owner) notFound();

  return <JustInCasePortrait mode="public" publicToken={token} />;
}
