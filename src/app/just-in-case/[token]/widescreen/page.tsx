import { JustInCaseLandscape } from "@/components/just-in-case/JustInCaseLandscape";
import { getJustInCaseOwner } from "@/lib/just-in-case-sync";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata = {
  title: "Just in Case Overlay · 16:9",
  description: "Public OBS overlay for Just in Case",
};

export default async function PublicJustInCaseWidescreenPage({ params }: Props) {
  const { token } = await params;
  const owner = await getJustInCaseOwner(token);
  if (!owner) notFound();

  return <JustInCaseLandscape mode="public" publicToken={token} />;
}
