import { JustInCaseLandscape } from "@/components/just-in-case/JustInCaseLandscape";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vault Just in Case 16:9",
  description: "Public widescreen Vault banker template",
};

export default function VaultWidescreenGamePage() {
  return <JustInCaseLandscape mode="open" theme="vault" />;
}
