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

const states = new Map<string, JustInCaseSharedGame>();
const publicRooms = new Set<string>();

export function justInCaseChannel(token: string) {
  return `just-in-case:${token}`;
}

export function createPublicJustInCaseRoom() {
  const token = nanoid(24);
  publicRooms.add(token);
  return token;
}

export function ensurePublicJustInCaseRoom(token: string) {
  if (!token || token.length < 8) return null;
  publicRooms.add(token);
  return token;
}

export async function getOrCreateJustInCaseToken(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { justInCaseToken: true },
  });
  if (existing?.justInCaseToken) {
    publicRooms.add(existing.justInCaseToken);
    return existing.justInCaseToken;
  }

  const token = nanoid(24);
  await prisma.user.update({
    where: { id: userId },
    data: { justInCaseToken: token },
  });
  publicRooms.add(token);
  return token;
}

export async function rotateJustInCaseToken(userId: string) {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { justInCaseToken: true },
  });
  if (previous?.justInCaseToken) {
    states.delete(previous.justInCaseToken);
    publicRooms.delete(previous.justInCaseToken);
  }

  const token = nanoid(24);
  await prisma.user.update({
    where: { id: userId },
    data: { justInCaseToken: token },
  });
  publicRooms.add(token);
  return token;
}

export async function justInCaseRoomExists(token: string) {
  if (publicRooms.has(token)) return true;
  const user = await prisma.user.findUnique({
    where: { justInCaseToken: token },
    select: { id: true },
  });
  if (user) {
    publicRooms.add(token);
    return true;
  }
  return false;
}

export function getJustInCaseState(token: string) {
  return states.get(token) ?? null;
}

export function setJustInCaseState(token: string, state: JustInCaseSharedGame) {
  publicRooms.add(token);
  states.set(token, state);
  publish(justInCaseChannel(token), state);
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

export function buildJustInCaseOverlayPaths(token: string) {
  return {
    widescreen: {
      cases: `/just-in-case/${token}/widescreen?overlay=cases`,
      player: `/just-in-case/${token}/widescreen?overlay=player`,
      offer: `/just-in-case/${token}/widescreen?overlay=offer`,
      full: `/just-in-case/${token}/widescreen`,
    },
    vertical: {
      cases: `/just-in-case/${token}/vertical?overlay=cases`,
      player: `/just-in-case/${token}/vertical?overlay=player`,
      offer: `/just-in-case/${token}/vertical?overlay=offer`,
      full: `/just-in-case/${token}/vertical`,
    },
  };
}
