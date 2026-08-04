import { JustInCasePortrait } from "@/components/just-in-case/JustInCasePortrait";
import { ensurePublicJustInCaseRoom } from "@/lib/just-in-case-sync";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ overlay?: string }>;
};

export const metadata = {
  title: "Vault Overlay · 9:16",
  description: "Public Vault vertical / OBS overlay",
};

export default async function PublicVaultVerticalPage({
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
      theme="vault"
      publicToken={token}
    />
  );
}
