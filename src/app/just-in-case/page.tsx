import { JustInCaseSizeChooser } from "@/components/just-in-case/JustInCaseSizeChooser";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Just in Case · Choose template",
  description: "Public Dom the Don Just in Case — choose Dom or Vault, 16:9 or 9:16",
};

export default function PublicJustInCaseChooserPage() {
  return <JustInCaseSizeChooser publicAccess />;
}
