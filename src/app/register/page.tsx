import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { prisma } from "@/lib/prisma";

export default async function RegisterPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className="auth-shell">
      <BrandHeader compact showBanner={false} />
      <div className="auth-card">
        <h1>Registration closed</h1>
        <p className="hint">
          This Viewer Games install is set up for a single operator account.
        </p>
        <Link className="btn gold wide" href="/login">
          Go to login
        </Link>
      </div>
    </main>
  );
}
