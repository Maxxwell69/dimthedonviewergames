import { NextResponse } from "next/server";
import {
  clearWheelEntries,
  dismissWinner,
  getSharedWheel,
  regenerateDisplayToken,
  regenerateWebhookSecret,
  shuffleWheelEntries,
} from "@/lib/wheel-service";

export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;
  const wheel = await getSharedWheel();

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
