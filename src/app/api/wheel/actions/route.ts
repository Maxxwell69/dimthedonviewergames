import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  clearWheelEntries,
  dismissWinner,
  getOrCreateWheelForUser,
  regenerateDisplayToken,
  regenerateWebhookSecret,
  shuffleWheelEntries,
} from "@/lib/wheel-service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const action = body.action as string;
  const wheel = await getOrCreateWheelForUser(session.user.id);

  try {
    switch (action) {
      case "shuffle":
        return NextResponse.json({ wheel: await shuffleWheelEntries(wheel.id) });
      case "clear":
        return NextResponse.json({ wheel: await clearWheelEntries(wheel.id) });
      case "dismissWinner":
        return NextResponse.json({ wheel: await dismissWinner(wheel.id) });
      case "regenerateDisplayToken":
        return NextResponse.json({ wheel: await regenerateDisplayToken(wheel.id) });
      case "regenerateWebhookSecret":
        return NextResponse.json({ wheel: await regenerateWebhookSecret(wheel.id) });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
