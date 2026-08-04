import { JustInCaseLandscape } from "@/components/just-in-case/JustInCaseLandscape";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case 16:9",
  description: "Public widescreen Just in Case game",
};

export default function PublicWidescreenGamePage() {
  return <JustInCaseLandscape mode="open" theme="dom" />;
}
