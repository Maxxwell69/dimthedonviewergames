import { JustInCasePortrait } from "@/components/just-in-case/JustInCasePortrait";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case 9:16",
  description: "Public vertical Just in Case game",
};

export default function PublicVerticalGamePage() {
  return <JustInCasePortrait mode="open" theme="dom" />;
}
