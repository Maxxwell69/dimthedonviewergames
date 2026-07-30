import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  addTikfinityEntry,
  clearWheelEntries,
  dismissWinner,
  getWheelForUser,
  regenerateDisplayToken,
  regenerateWebhookSecret,
  serializeWheel,
  shuffleWheelEntries,
} from "@/lib/wheel-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const owned = await getWheelForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Wheel not found" }, { status: 404 });

  const body = await req.json();
  const action = body.action as string;

  try {
    switch (action) {
      case "shuffle":
        return NextResponse.json({ wheel: await shuffleWheelEntries(id) });
      case "clear":
        return NextResponse.json({ wheel: await clearWheelEntries(id) });
      case "dismissWinner":
        return NextResponse.json({ wheel: await dismissWinner(id) });
      case "regenerateDisplayToken":
        return NextResponse.json({ wheel: await regenerateDisplayToken(id) });
      case "regenerateWebhookSecret":
        return NextResponse.json({ wheel: await regenerateWebhookSecret(id) });
      case "testEnter": {
        const username = String(body.username || "webhook_test").trim() || "webhook_test";
        const result = await addTikfinityEntry({
          webhookSecret: owned.webhookSecret,
          username,
          nickname: username,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        const refreshed = result.wheel
          ? result.wheel
          : serializeWheel((await getWheelForUser(session.user.id, id))!);
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
