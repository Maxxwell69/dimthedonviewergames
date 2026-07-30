import { redirect } from "next/navigation";

export default function RegisterPage() {
  // No DB access here — build-time Prisma calls break Railway image builds.
  // Signup is already blocked in /api/auth/register once an operator exists.
  redirect("/login");
}
