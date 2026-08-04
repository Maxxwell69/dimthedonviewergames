import { nanoid } from "nanoid";
import { publish, subscribe } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export type JustInCasePhase =
  | "choose"
  | "opening"
  | "offer"
  | "final"
  | "finished";

export type JustInCaseSharedGame = {
  max: number;
  draft: number;
  values: number[];
  cases: { id: number; value: number }[];
  reserved: number | null;
  opened: number[];
  round: number;
  roundCount: number;
  phase: JustInCasePhase;
  offer: number;
  result: string;
  revealing: number | null;
};

export type JustInCaseImageAsset = {
  name: string;
  url: string;
} | null;

export type JustInCaseZoneAssets = {
  player: JustInCaseImageAsset;
  dom: JustInCaseImageAsset;
  stage: JustInCaseImageAsset;
};

export type JustInCaseRoomAssets = {
  dom?: JustInCaseZoneAssets;
  vault?: JustInCaseZoneAssets;
};

export type JustInCaseRoomSnapshot = {
  token: string;
  state: JustInCaseSharedGame | null;
  updatedAt: string | null;
  assetsUpdatedAt: string | null;
};

export function justInCaseChannel(token: string) {
  return `just-in-case:${token}`;
}

export async function createPublicJustInCaseRoom() {
  const token = nanoid(24);
  await prisma.justInCaseRoom.upsert({
    where: { token },
    create: { token, stateJson: "" },
    update: {},
  });
  return token;
}

export async function ensurePublicJustInCaseRoom(token: string) {
  if (!token || token.length < 8) return null;
  await prisma.justInCaseRoom.upsert({
    where: { token },
    create: { token, stateJson: "" },
    update: {},
  });
  return token;
}

export async function getOrCreateJustInCaseToken(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { justInCaseToken: true },
  });
  if (existing?.justInCaseToken) {
    await ensurePublicJustInCaseRoom(existing.justInCaseToken);
    return existing.justInCaseToken;
  }

  const token = nanoid(24);
  await prisma.user.update({
    where: { id: userId },
    data: { justInCaseToken: token },
  });
  await ensurePublicJustInCaseRoom(token);
  return token;
}

export async function rotateJustInCaseToken(userId: string) {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { justInCaseToken: true },
  });
  if (previous?.justInCaseToken) {
    await prisma.justInCaseRoom.deleteMany({
      where: { token: previous.justInCaseToken },
    });
  }

  const token = nanoid(24);
  await prisma.user.update({
    where: { id: userId },
    data: { justInCaseToken: token },
  });
  await ensurePublicJustInCaseRoom(token);
  return token;
}

export async function justInCaseRoomExists(token: string) {
  const room = await prisma.justInCaseRoom.findUnique({
    where: { token },
    select: { token: true },
  });
  if (room) return true;

  const user = await prisma.user.findUnique({
    where: { justInCaseToken: token },
    select: { id: true },
  });
  if (!user) return false;
  await ensurePublicJustInCaseRoom(token);
  return true;
}

function parseState(stateJson: string): JustInCaseSharedGame | null {
  if (!stateJson) return null;
  try {
    const parsed = JSON.parse(stateJson) as unknown;
    return isValidJustInCaseState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isImageAsset(value: unknown): value is JustInCaseImageAsset {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.name === "string" && typeof data.url === "string" && data.url.length > 0;
}

function isZoneAssets(value: unknown): value is JustInCaseZoneAssets {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    isImageAsset(data.player) &&
    isImageAsset(data.dom) &&
    isImageAsset(data.stage)
  );
}

export function isValidJustInCaseAssets(
  value: unknown,
): value is JustInCaseRoomAssets {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (data.dom !== undefined && !isZoneAssets(data.dom)) return false;
  if (data.vault !== undefined && !isZoneAssets(data.vault)) return false;
  return data.dom !== undefined || data.vault !== undefined;
}

function parseAssets(assetsJson: string): JustInCaseRoomAssets | null {
  if (!assetsJson) return null;
  try {
    const parsed = JSON.parse(assetsJson) as unknown;
    return isValidJustInCaseAssets(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Cap data-URL payloads so room sync stays reliable for OBS. */
const MAX_ASSET_URL_CHARS = 2_500_000;

export function isValidJustInCaseZoneAssetsPayload(
  value: unknown,
): value is JustInCaseZoneAssets {
  if (!isZoneAssets(value)) return false;
  for (const key of ["player", "dom", "stage"] as const) {
    const asset = value[key];
    if (asset && asset.url.length > MAX_ASSET_URL_CHARS) return false;
  }
  return true;
}

export async function getJustInCaseSnapshot(
  token: string,
): Promise<JustInCaseRoomSnapshot> {
  const room = await prisma.justInCaseRoom.findUnique({ where: { token } });
  if (!room) {
    return { token, state: null, updatedAt: null, assetsUpdatedAt: null };
  }
  return {
    token,
    state: parseState(room.stateJson),
    updatedAt: room.updatedAt.toISOString(),
    assetsUpdatedAt: room.assetsUpdatedAt?.toISOString() ?? null,
  };
}

export type JustInCaseZonePresence = {
  player: boolean;
  dom: boolean;
  stage: boolean;
};

export type JustInCaseAssetsMeta = {
  assetsUpdatedAt: string | null;
  present: {
    dom?: JustInCaseZonePresence;
    vault?: JustInCaseZonePresence;
  };
};

function zonePresence(zone?: JustInCaseZoneAssets): JustInCaseZonePresence {
  return {
    player: Boolean(zone?.player?.url),
    dom: Boolean(zone?.dom?.url),
    stage: Boolean(zone?.stage?.url),
  };
}

export async function getJustInCaseAssets(token: string): Promise<{
  assets: JustInCaseRoomAssets | null;
  assetsUpdatedAt: string | null;
}> {
  const room = await prisma.justInCaseRoom.findUnique({
    where: { token },
    select: { assetsJson: true, assetsUpdatedAt: true },
  });
  if (!room) {
    return { assets: null, assetsUpdatedAt: null };
  }
  return {
    assets: parseAssets(room.assetsJson),
    assetsUpdatedAt: room.assetsUpdatedAt?.toISOString() ?? null,
  };
}

/** Light payload for OBS polling — no multi‑MB data URLs. */
export async function getJustInCaseAssetsMeta(
  token: string,
): Promise<JustInCaseAssetsMeta> {
  const snapshot = await getJustInCaseAssets(token);
  const assets = snapshot.assets;
  return {
    assetsUpdatedAt: snapshot.assetsUpdatedAt,
    present: {
      ...(assets?.dom ? { dom: zonePresence(assets.dom) } : {}),
      ...(assets?.vault ? { vault: zonePresence(assets.vault) } : {}),
    },
  };
}

export async function getJustInCaseZoneImage(
  token: string,
  theme: "dom" | "vault",
  slot: "player" | "dom" | "stage",
): Promise<
  | { kind: "bytes"; contentType: string; body: Buffer }
  | { kind: "redirect"; location: string }
  | null
> {
  const snapshot = await getJustInCaseAssets(token);
  const zone = theme === "vault" ? snapshot.assets?.vault : snapshot.assets?.dom;
  const asset = zone?.[slot];
  if (!asset?.url) return null;

  const url = asset.url;
  if (url.startsWith("data:")) {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(url);
    if (!match) return null;
    return {
      kind: "bytes",
      contentType: match[1] || "image/jpeg",
      body: Buffer.from(match[2], "base64"),
    };
  }
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    return { kind: "redirect", location: url };
  }
  return null;
}

export async function setJustInCaseThemeAssets(
  token: string,
  theme: "dom" | "vault",
  zone: JustInCaseZoneAssets,
) {
  const existing = await getJustInCaseAssets(token);
  const next: JustInCaseRoomAssets = {
    ...(existing.assets ?? {}),
    [theme]: zone,
  };
  const assetsJson = JSON.stringify(next);
  const room = await prisma.justInCaseRoom.upsert({
    where: { token },
    create: {
      token,
      stateJson: "",
      assetsJson,
      assetsUpdatedAt: new Date(),
    },
    update: {
      assetsJson,
      assetsUpdatedAt: new Date(),
    },
  });
  const assetsUpdatedAt = room.assetsUpdatedAt?.toISOString() ?? new Date().toISOString();
  publish(justInCaseChannel(token), {
    type: "assets",
    theme,
    assetsUpdatedAt,
    present: {
      dom: next.dom ? zonePresence(next.dom) : undefined,
      vault: next.vault ? zonePresence(next.vault) : undefined,
    },
  });
  return {
    assetsUpdatedAt,
    present: {
      ...(next.dom ? { dom: zonePresence(next.dom) } : {}),
      ...(next.vault ? { vault: zonePresence(next.vault) } : {}),
    },
  };
}

export async function setJustInCaseState(
  token: string,
  state: JustInCaseSharedGame,
) {
  const stateJson = JSON.stringify(state);
  const room = await prisma.justInCaseRoom.upsert({
    where: { token },
    create: { token, stateJson },
    update: { stateJson },
  });
  publish(justInCaseChannel(token), {
    state,
    updatedAt: room.updatedAt.toISOString(),
  });
  return room.updatedAt.toISOString();
}

export function subscribeJustInCase(
  token: string,
  listener: (payload: unknown) => void,
) {
  return subscribe(justInCaseChannel(token), listener);
}

export function isValidJustInCaseState(
  value: unknown,
): value is JustInCaseSharedGame {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.max === "number" &&
    typeof data.draft === "number" &&
    Array.isArray(data.values) &&
    Array.isArray(data.cases) &&
    Array.isArray(data.opened) &&
    typeof data.round === "number" &&
    typeof data.roundCount === "number" &&
    typeof data.phase === "string" &&
    typeof data.offer === "number" &&
    typeof data.result === "string" &&
    (data.reserved === null || typeof data.reserved === "number") &&
    (data.revealing === null || typeof data.revealing === "number")
  );
}

function overlayPack(base: string) {
  return {
    cases: `${base}?overlay=cases`,
    player: `${base}?overlay=player`,
    offer: `${base}?overlay=offer`,
    full: base,
  };
}

/** Dom (default routes) + Vault template overlay URL packs. */
export function buildJustInCaseOverlayPaths(token: string) {
  return {
    widescreen: overlayPack(`/just-in-case/${token}/widescreen`),
    vertical: overlayPack(`/just-in-case/${token}/vertical`),
    vault: {
      widescreen: overlayPack(`/just-in-case/${token}/vault/widescreen`),
      vertical: overlayPack(`/just-in-case/${token}/vault/vertical`),
    },
  };
}
