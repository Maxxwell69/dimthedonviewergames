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

export type JustInCaseRoomSnapshot = {
  token: string;
  state: JustInCaseSharedGame | null;
  updatedAt: string | null;
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

export async function getJustInCaseSnapshot(
  token: string,
): Promise<JustInCaseRoomSnapshot> {
  const room = await prisma.justInCaseRoom.findUnique({ where: { token } });
  if (!room) {
    return { token, state: null, updatedAt: null };
  }
  return {
    token,
    state: parseState(room.stateJson),
    updatedAt: room.updatedAt.toISOString(),
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
