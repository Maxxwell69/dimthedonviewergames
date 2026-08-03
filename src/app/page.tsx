import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  // Logged-in operators go to the dashboard. Anonymous visitors (and TikTok/OBS
  // browser sources that load the site root) go to the public game — never login.
  redirect(session?.user ? "/dashboard" : "/just-in-case");
}
