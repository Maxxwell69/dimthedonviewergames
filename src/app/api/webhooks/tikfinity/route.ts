import { NextResponse } from "next/server";
import { addTikfinityEntry } from "@/lib/wheel-service";

/**
 * TikFinity Trigger Webhook target.
 *
 * Recommended JSON body (use TikFinity placeholders):
 * {
 *   "secret": "<your webhook secret>",
 *   "username": "%username%",
 *   "nickname": "%nickname%",
 *   "userId": "%userId%",
 *   "command": "!enter"
 * }
 *
 * Also accepts secret via ?secret= or header x-webhook-secret
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") || "";

    let body: Record<string, unknown> = {};
    if (contentType.includes("application/json")) {
      body = (await req.json()) as Record<string, unknown>;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      form.forEach((value, key) => {
        body[key] = String(value);
      });
    } else {
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          body = { raw: text };
        }
      }
    }

    const secret =
      String(body.secret ?? body.webhookSecret ?? "") ||
      url.searchParams.get("secret") ||
      req.headers.get("x-webhook-secret") ||
      "";

    if (!secret) {
      return NextResponse.json({ error: "Missing webhook secret" }, { status: 401 });
    }

    const username = String(
      body.username ?? body.uniqueId ?? body.user ?? body.handle ?? "",
    );
    const nickname = String(body.nickname ?? body.nickName ?? body.displayName ?? "");
    const userId = String(body.userId ?? body.user_id ?? "");

    const result = await addTikfinityEntry({
      webhookSecret: secret,
      username: username || undefined,
      nickname: nickname || undefined,
      userId: userId || undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      label: result.label,
      alreadyEntered: result.alreadyEntered,
    });
  } catch (error) {
    console.error("TikFinity webhook error", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // TikFinity sometimes pings endpoints; also handy for quick browser checks.
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({
      ok: true,
      message: "TikFinity webhook endpoint ready. POST !enter events here.",
    });
  }

  const username = url.searchParams.get("username") || undefined;
  if (!username) {
    return NextResponse.json({ error: "Provide username query param for test enters" }, { status: 400 });
  }

  const result = await addTikfinityEntry({
    webhookSecret: secret,
    username,
    nickname: url.searchParams.get("nickname") || undefined,
    userId: url.searchParams.get("userId") || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
