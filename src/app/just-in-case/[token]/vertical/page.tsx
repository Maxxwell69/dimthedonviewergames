import { JustInCasePortrait } from "@/components/just-in-case/JustInCasePortrait";
import { ensurePublicJustInCaseRoom } from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ overlay?: string }>;
};

export const metadata = {
  title: "Just in Case Overlay · 9:16",
  description: "Public Just in Case vertical / OBS overlay",
};

export default async function PublicJustInCaseVerticalPage({
  params,
  searchParams,
}: Props) {
  const { token } = await params;
  const { overlay } = await searchParams;
  await ensurePublicJustInCaseRoom(token);
  const isOverlay = overlay === "cases" || overlay === "player" || overlay === "offer";

  return (
    <JustInCasePortrait
      mode={isOverlay ? "viewer" : "open"}
      publicToken={token}
    />
  );
}
