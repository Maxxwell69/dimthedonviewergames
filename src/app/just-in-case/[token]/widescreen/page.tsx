import { JustInCaseLandscape } from "@/components/just-in-case/JustInCaseLandscape";
import { ensurePublicJustInCaseRoom } from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ overlay?: string }>;
};

export const metadata = {
  title: "Just in Case Overlay · 16:9",
  description: "Public Just in Case widescreen / OBS overlay",
};

export default async function PublicJustInCaseWidescreenPage({
  params,
  searchParams,
}: Props) {
  const { token } = await params;
  const { overlay } = await searchParams;
  await ensurePublicJustInCaseRoom(token);
  const isOverlay = overlay === "cases" || overlay === "player" || overlay === "offer";

  // Overlay views are follow-only. Full game URL can control AND follow the room.
  return (
    <JustInCaseLandscape
      mode={isOverlay ? "viewer" : "open"}
      publicToken={token}
    />
  );
}
