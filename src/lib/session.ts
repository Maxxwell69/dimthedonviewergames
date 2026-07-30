import { auth } from "@/lib/auth";

export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return userId;
}

export async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}
