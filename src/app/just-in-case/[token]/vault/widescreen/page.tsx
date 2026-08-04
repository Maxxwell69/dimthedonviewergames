import { JustInCaseLandscape } from "@/components/just-in-case/JustInCaseLandscape";
import { ensurePublicJustInCaseRoom } from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ overlay?: string }>;
};

export const metadata = {
  title: "Vault Overlay · 16:9",
  description: "Public Vault widescreen / OBS overlay",
};

export default async function PublicVaultWidescreenPage({
  params,
  searchParams,
}: Props) {
  const { token } = await params;
  const { overlay } = await searchParams;
  await ensurePublicJustInCaseRoom(token);
  const isOverlay = overlay === "cases" || overlay === "player" || overlay === "offer";

  return (
    <JustInCaseLandscape
      mode={isOverlay ? "viewer" : "open"}
      theme="vault"
      publicToken={token}
    />
  );
}
