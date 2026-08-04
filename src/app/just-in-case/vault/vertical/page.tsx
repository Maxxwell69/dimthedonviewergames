import { JustInCasePortrait } from "@/components/just-in-case/JustInCasePortrait";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vault Just in Case 9:16",
  description: "Public vertical Vault banker template",
};

export default function VaultVerticalGamePage() {
  return <JustInCasePortrait mode="open" theme="vault" />;
}
