import { redirect } from "next/navigation";

export default function HomePage() {
  // Keep the root route simple — calling auth() here was crashing production
  // when AUTH_SECRET/session setup threw. Login + middleware handle auth.
  redirect("/login");
}
