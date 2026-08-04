import { NextResponse } from "next/server";
import {
  getJustInCaseZoneImage,
  justInCaseRoomExists,
} from "@/lib/just-in-case-sync";

type Params = {
  params: Promise<{ token: string; theme: string; slot: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: Params) {
  const { token, theme: themeRaw, slot: slotRaw } = await params;
  if (!(await justInCaseRoomExists(token))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const theme = themeRaw === "vault" ? "vault" : themeRaw === "dom" ? "dom" : null;
  const slot =
    slotRaw === "player" || slotRaw === "dom" || slotRaw === "stage"
      ? slotRaw
      : null;
  if (!theme || !slot) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }

  const image = await getJustInCaseZoneImage(token, theme, slot);
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (image.kind === "redirect") {
    return NextResponse.redirect(new URL(image.location, _req.url), 302);
  }

  return new NextResponse(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
