import { NextResponse } from "next/server";
import {
  addTikfinityEntry,
  clearWheelEntries,
  dismissWinner,
  getSharedWheel,
  regenerateDisplayToken,
  regenerateWebhookSecret,
  serializeWheel,
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
      case "testEnter": {
        const username = String(body.username || "webhook_test").trim() || "webhook_test";
        const result = await addTikfinityEntry({
          webhookSecret: wheel.webhookSecret,
          username,
          nickname: username,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        const refreshed = result.wheel
          ? result.wheel
          : serializeWheel(await getSharedWheel());
        return NextResponse.json({
          wheel: refreshed,
          label: result.label,
          alreadyEntered: result.alreadyEntered,
        });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
