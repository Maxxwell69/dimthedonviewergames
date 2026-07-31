import { prisma } from "@/lib/prisma";
import { displayChannel, publish, wheelChannel } from "@/lib/events";
import {
  normalizeLabel,
  parseEntriesText,
  pickWeightedIndex,
  shuffleArray,
  targetAngleForIndex,
} from "@/lib/wheel-math";
import {
  clampVolume,
  DEFAULT_WHEEL_COLORS,
  normalizeHexColor,
  type WheelSummaryDTO,
} from "@/lib/types";

const wheelInclude = {
  entries: { orderBy: { sortOrder: "asc" as const } },
  winners: { orderBy: { createdAt: "desc" as const }, take: 25 },
};

const OPERATOR_EMAIL = "operator@local";

export async function createWheelForUser(
  userId: string,
  input?: { title?: string; description?: string },
) {
  return prisma.wheel.create({
    data: {
      userId,
      title: input?.title?.trim() || "Viewer Games",
      description: input?.description?.trim() || "",
      ...DEFAULT_WHEEL_COLORS,
    },
    include: wheelInclude,
  });
}

/** Claim legacy operator wheels, or create a starter wheel. */
export async function ensureUserHasWheels(userId: string) {
  const existing = await prisma.wheel.count({ where: { userId } });
  if (existing > 0) return;

  const operator = await prisma.user.findUnique({ where: { email: OPERATOR_EMAIL } });
  if (operator && operator.id !== userId) {
    const moved = await prisma.wheel.updateMany({
      where: { userId: operator.id },
      data: { userId },
    });
    if (moved.count > 0) return;
  }

  await createWheelForUser(userId, {
    title: "Viewer Games",
    description: "Main giveaway wheel",
  });
}

export async function listWheelsForUser(userId: string): Promise<WheelSummaryDTO[]> {
  await ensureUserHasWheels(userId);
  const wheels = await prisma.wheel.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  return wheels.map((wheel) => ({
    id: wheel.id,
    title: wheel.title,
    description: wheel.description,
    isActive: wheel.isActive,
    entryCount: wheel._count.entries,
    updatedAt: wheel.updatedAt.toISOString(),
    colorPrimary: wheel.colorPrimary,
    colorSecondary: wheel.colorSecondary,
    colorAccent: wheel.colorAccent,
  }));
}

/** Rewrite stored labels that still have a leading @ (from older normalizeLabel). */
export async function stripAtSignsFromWheel(wheelId: string) {
  const wheel = await prisma.wheel.findUnique({
    where: { id: wheelId },
    include: {
      entries: true,
      winners: { take: 50, orderBy: { createdAt: "desc" } },
    },
  });
  if (!wheel) return;

  const dirty =
    wheel.entries.some((e) => e.label.startsWith("@")) ||
    (wheel.currentWinner?.startsWith("@") ?? false) ||
    wheel.winners.some((w) => w.label.startsWith("@")) ||
    /(?:^|\n)@/m.test(wheel.entriesText);
  if (!dirty) return;

  for (const entry of wheel.entries) {
    const clean = normalizeLabel(entry.label);
    if (!clean || clean === entry.label) continue;
    const conflict = await prisma.entry.findUnique({
      where: { wheelId_label: { wheelId, label: clean } },
    });
    if (conflict && conflict.id !== entry.id) {
      await prisma.entry.delete({ where: { id: entry.id } });
      continue;
    }
    await prisma.entry.update({
      where: { id: entry.id },
      data: {
        label: clean,
        tiktokUsername: entry.tiktokUsername
          ? normalizeLabel(entry.tiktokUsername)
          : entry.tiktokUsername,
      },
    });
  }

  for (const winner of wheel.winners) {
    const clean = normalizeLabel(winner.label);
    if (clean && clean !== winner.label) {
      await prisma.winner.update({
        where: { id: winner.id },
        data: { label: clean },
      });
    }
  }

  const entries = await prisma.entry.findMany({
    where: { wheelId },
    orderBy: { sortOrder: "asc" },
  });
  await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      currentWinner: wheel.currentWinner
        ? normalizeLabel(wheel.currentWinner)
        : wheel.currentWinner,
      entriesText: entries
        .map((e) => (e.weight > 1 ? `${e.label}:${e.weight}` : e.label))
        .join("\n"),
    },
  });
}

export async function getWheelForUser(userId: string, wheelId: string) {
  const wheel = await prisma.wheel.findFirst({
    where: { id: wheelId, userId },
    include: wheelInclude,
  });
  if (!wheel) return null;
  await stripAtSignsFromWheel(wheel.id);
  return prisma.wheel.findFirst({
    where: { id: wheelId, userId },
    include: wheelInclude,
  });
}

export async function getOrCreateWheelForUser(userId: string) {
  await ensureUserHasWheels(userId);
  const existing = await prisma.wheel.findFirst({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: wheelInclude,
  });
  if (existing) return existing;
  return createWheelForUser(userId);
}

/** @deprecated Prefer auth + getWheelForUser. Kept for legacy bootstrap. */
export async function getSharedWheel() {
  const existing = await prisma.wheel.findFirst({
    orderBy: { createdAt: "asc" },
    include: wheelInclude,
  });
  if (existing) return existing;

  const operator =
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.user.create({
      data: {
        email: OPERATOR_EMAIL,
        passwordHash: "disabled",
        name: "Operator",
      },
    }));

  return getOrCreateWheelForUser(operator.id);
}

export function serializeWheel(
  wheel: Awaited<ReturnType<typeof getOrCreateWheelForUser>>,
) {
  return {
    id: wheel.id,
    title: wheel.title,
    description: wheel.description ?? "",
    isActive: wheel.isActive ?? true,
    displayToken: wheel.displayToken,
    webhookSecret: wheel.webhookSecret,
    removeOnWin: wheel.removeOnWin,
    spinDurationMs: wheel.spinDurationMs,
    soundEnabled: wheel.soundEnabled,
    celebrateEnabled: wheel.celebrateEnabled,
    spinVolume: wheel.spinVolume,
    celebrateVolume: wheel.celebrateVolume,
    allowDuplicates: wheel.allowDuplicates,
    colorPrimary: wheel.colorPrimary || DEFAULT_WHEEL_COLORS.colorPrimary,
    colorSecondary: wheel.colorSecondary || DEFAULT_WHEEL_COLORS.colorSecondary,
    colorAccent: wheel.colorAccent || DEFAULT_WHEEL_COLORS.colorAccent,
    hubImageUrl: wheel.hubImageUrl ?? null,
    isSpinning: wheel.isSpinning,
    spinStartedAt: wheel.spinStartedAt?.toISOString() ?? null,
    spinEndsAt: wheel.spinEndsAt?.toISOString() ?? null,
    spinTargetAngle: wheel.spinTargetAngle,
    currentWinner: wheel.currentWinner ? normalizeLabel(wheel.currentWinner) : null,
    lastWinnerAt: wheel.lastWinnerAt?.toISOString() ?? null,
    entriesText: wheel.entriesText
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        const weightMatch = trimmed.match(/^(.*?)(?::\s*|,\s*|x)(\d+)\s*$/i);
        if (weightMatch) {
          const label = normalizeLabel(weightMatch[1]);
          return label ? `${label}:${weightMatch[2]}` : "";
        }
        return normalizeLabel(trimmed);
      })
      .filter(Boolean)
      .join("\n"),
    entries: wheel.entries.map((e) => ({
      id: e.id,
      label: normalizeLabel(e.label),
      weight: e.weight,
      source: e.source,
      tiktokUsername: e.tiktokUsername ? normalizeLabel(e.tiktokUsername) : e.tiktokUsername,
    })),
    winners: wheel.winners.map((w) => ({
      id: w.id,
      label: normalizeLabel(w.label),
      createdAt: w.createdAt.toISOString(),
    })),
    updatedAt: wheel.updatedAt.toISOString(),
  };
}

export type PublicWheel = ReturnType<typeof serializeWheel>;

export function serializeDisplayWheel(
  wheel: Awaited<ReturnType<typeof getOrCreateWheelForUser>>,
) {
  const full = serializeWheel(wheel);
  return {
    id: full.id,
    title: full.title,
    removeOnWin: full.removeOnWin,
    spinDurationMs: full.spinDurationMs,
    soundEnabled: full.soundEnabled,
    celebrateEnabled: full.celebrateEnabled,
    spinVolume: full.spinVolume,
    celebrateVolume: full.celebrateVolume,
    colorPrimary: full.colorPrimary,
    colorSecondary: full.colorSecondary,
    colorAccent: full.colorAccent,
    hubImageUrl: full.hubImageUrl,
    isSpinning: full.isSpinning,
    spinStartedAt: full.spinStartedAt,
    spinEndsAt: full.spinEndsAt,
    spinTargetAngle: full.spinTargetAngle,
    currentWinner: full.currentWinner,
    lastWinnerAt: full.lastWinnerAt,
    entries: full.entries,
    winners: full.winners,
    updatedAt: full.updatedAt,
  };
}

export async function deleteWheelForUser(userId: string, wheelId: string) {
  const count = await prisma.wheel.count({ where: { userId } });
  if (count <= 1) throw new Error("Keep at least one wheel");
  const wheel = await prisma.wheel.findFirst({ where: { id: wheelId, userId } });
  if (!wheel) throw new Error("Wheel not found");
  await prisma.wheel.delete({ where: { id: wheelId } });
}

async function syncEntriesFromText(wheelId: string, text: string) {
  const parsed = parseEntriesText(text);
  const unique = new Map<string, { label: string; weight: number }>();
  for (const item of parsed) {
    if (!unique.has(item.label.toLowerCase())) {
      unique.set(item.label.toLowerCase(), item);
    }
  }
  const list = [...unique.values()];

  await prisma.$transaction([
    prisma.entry.deleteMany({ where: { wheelId } }),
    prisma.wheel.update({
      where: { id: wheelId },
      data: {
        entriesText: list.map((e) => (e.weight > 1 ? `${e.label}:${e.weight}` : e.label)).join("\n"),
      },
    }),
  ]);

  if (list.length) {
    await prisma.entry.createMany({
      data: list.map((e, index) => ({
        wheelId,
        label: e.label,
        weight: e.weight,
        sortOrder: index,
        source: "manual",
      })),
    });
  }
}

export async function updateWheelSettings(
  wheelId: string,
  data: {
    title?: string;
    description?: string;
    isActive?: boolean;
    removeOnWin?: boolean;
    spinDurationMs?: number;
    soundEnabled?: boolean;
    celebrateEnabled?: boolean;
    spinVolume?: number;
    celebrateVolume?: number;
    allowDuplicates?: boolean;
    colorPrimary?: string;
    colorSecondary?: string;
    colorAccent?: string;
    hubImageUrl?: string | null;
    entriesText?: string;
  },
) {
  if (typeof data.entriesText === "string") {
    await syncEntriesFromText(wheelId, data.entriesText);
  }

  const wheel = await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      title: data.title,
      description: typeof data.description === "string" ? data.description : undefined,
      isActive: typeof data.isActive === "boolean" ? data.isActive : undefined,
      removeOnWin: data.removeOnWin,
      spinDurationMs: data.spinDurationMs,
      soundEnabled: data.soundEnabled,
      celebrateEnabled: data.celebrateEnabled,
      spinVolume:
        typeof data.spinVolume === "number" ? clampVolume(data.spinVolume) : undefined,
      celebrateVolume:
        typeof data.celebrateVolume === "number"
          ? clampVolume(data.celebrateVolume)
          : undefined,
      allowDuplicates: data.allowDuplicates,
      colorPrimary:
        typeof data.colorPrimary === "string"
          ? normalizeHexColor(data.colorPrimary, DEFAULT_WHEEL_COLORS.colorPrimary)
          : undefined,
      colorSecondary:
        typeof data.colorSecondary === "string"
          ? normalizeHexColor(data.colorSecondary, DEFAULT_WHEEL_COLORS.colorSecondary)
          : undefined,
      colorAccent:
        typeof data.colorAccent === "string"
          ? normalizeHexColor(data.colorAccent, DEFAULT_WHEEL_COLORS.colorAccent)
          : undefined,
      hubImageUrl:
        data.hubImageUrl === null
          ? null
          : typeof data.hubImageUrl === "string"
            ? data.hubImageUrl
            : undefined,
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(wheel);
  publish(wheelChannel(wheel.id), { type: "update", wheel: payload });
  publish(displayChannel(wheel.displayToken), {
    type: "update",
    wheel: serializeDisplayWheel(wheel),
  });
  return payload;
}

export async function shuffleWheelEntries(wheelId: string) {
  const entries = await prisma.entry.findMany({
    where: { wheelId },
    orderBy: { sortOrder: "asc" },
  });
  const shuffled = shuffleArray(entries);
  await prisma.$transaction(
    shuffled.map((entry, index) =>
      prisma.entry.update({
        where: { id: entry.id },
        data: { sortOrder: index },
      }),
    ),
  );

  const wheel = await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      entriesText: shuffled
        .map((e) => (e.weight > 1 ? `${e.label}:${e.weight}` : e.label))
        .join("\n"),
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(wheel);
  publish(wheelChannel(wheel.id), { type: "update", wheel: payload });
  publish(displayChannel(wheel.displayToken), {
    type: "update",
    wheel: serializeDisplayWheel(wheel),
  });
  return payload;
}

export async function clearWheelEntries(wheelId: string) {
  await prisma.entry.deleteMany({ where: { wheelId } });
  const wheel = await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      entriesText: "",
      isSpinning: false,
      currentWinner: null,
      spinStartedAt: null,
      spinEndsAt: null,
      spinTargetAngle: null,
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(wheel);
  publish(wheelChannel(wheel.id), { type: "update", wheel: payload });
  publish(displayChannel(wheel.displayToken), {
    type: "update",
    wheel: serializeDisplayWheel(wheel),
  });
  return payload;
}

export async function addTikfinityEntry(input: {
  webhookSecret: string;
  username?: string;
  nickname?: string;
  userId?: string;
}) {
  const wheel = await prisma.wheel.findUnique({
    where: { webhookSecret: input.webhookSecret },
  });
  if (!wheel) return { ok: false as const, error: "Invalid webhook secret" };

  const raw = input.username || input.nickname;
  if (!raw) return { ok: false as const, error: "Missing username" };

  await stripAtSignsFromWheel(wheel.id);

  const label = normalizeLabel(raw);
  if (!label) return { ok: false as const, error: "Missing username" };

  const existing = await prisma.entry.findUnique({
    where: { wheelId_label: { wheelId: wheel.id, label } },
  });

  if (existing && !wheel.allowDuplicates) {
    return { ok: true as const, alreadyEntered: true, label };
  }

  if (!existing) {
    const count = await prisma.entry.count({ where: { wheelId: wheel.id } });
    await prisma.entry.create({
      data: {
        wheelId: wheel.id,
        label,
        weight: 1,
        sortOrder: count,
        source: "tikfinity",
        tiktokUsername: input.username ? normalizeLabel(input.username) : label,
        tiktokUserId: input.userId ?? null,
      },
    });
  } else if (wheel.allowDuplicates) {
    await prisma.entry.update({
      where: { id: existing.id },
      data: { weight: existing.weight + 1 },
    });
  }

  const refreshed = await prisma.wheel.update({
    where: { id: wheel.id },
    data: {
      entriesText: (
        await prisma.entry.findMany({
          where: { wheelId: wheel.id },
          orderBy: { sortOrder: "asc" },
        })
      )
        .map((e) => (e.weight > 1 ? `${e.label}:${e.weight}` : e.label))
        .join("\n"),
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(refreshed);
  publish(wheelChannel(refreshed.id), { type: "enter", wheel: payload, label });
  publish(displayChannel(refreshed.displayToken), {
    type: "enter",
    wheel: serializeDisplayWheel(refreshed),
    label,
  });

  return { ok: true as const, alreadyEntered: false, label, wheel: payload };
}

export async function spinWheel(wheelId: string) {
  await stripAtSignsFromWheel(wheelId);
  const wheel = await prisma.wheel.findUnique({
    where: { id: wheelId },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  if (!wheel) throw new Error("Wheel not found");
  if (wheel.isSpinning) throw new Error("Wheel is already spinning");
  if (wheel.entries.length < 1) throw new Error("Add at least one name before spinning");

  const winnerIndex = pickWeightedIndex(wheel.entries);
  const winner = wheel.entries[winnerIndex];
  const targetAngle = targetAngleForIndex(winnerIndex, wheel.entries);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + wheel.spinDurationMs);

  const updated = await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      isSpinning: true,
      spinStartedAt: startedAt,
      spinEndsAt: endsAt,
      spinTargetAngle: targetAngle,
      currentWinner: normalizeLabel(winner.label),
      lastWinnerAt: null,
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(updated);
  publish(wheelChannel(updated.id), { type: "spin", wheel: payload });
  publish(displayChannel(updated.displayToken), {
    type: "spin",
    wheel: serializeDisplayWheel(updated),
  });

  // Finalize after spin duration (best-effort on this instance)
  setTimeout(() => {
    void finalizeSpin(wheelId).catch(() => undefined);
  }, wheel.spinDurationMs + 50);

  return payload;
}

export async function finalizeSpin(wheelId: string) {
  const wheel = await prisma.wheel.findUnique({
    where: { id: wheelId },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  if (!wheel || !wheel.isSpinning || !wheel.currentWinner) return null;

  // Record the win, but keep the name on the wheel until Continue is pressed.
  await prisma.winner.create({
    data: { wheelId, label: wheel.currentWinner },
  });

  const updated = await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      isSpinning: false,
      lastWinnerAt: new Date(),
      spinStartedAt: null,
      spinEndsAt: null,
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(updated);
  publish(wheelChannel(updated.id), { type: "winner", wheel: payload });
  publish(displayChannel(updated.displayToken), {
    type: "winner",
    wheel: serializeDisplayWheel(updated),
  });
  return payload;
}

export async function dismissWinner(wheelId: string) {
  const current = await prisma.wheel.findUnique({ where: { id: wheelId } });
  if (!current) throw new Error("Wheel not found");

  // Remove winner from entries only when Continue is hit (if enabled).
  if (current.removeOnWin && current.currentWinner) {
    await prisma.entry.deleteMany({
      where: { wheelId, label: current.currentWinner },
    });
  }

  const entries = await prisma.entry.findMany({
    where: { wheelId },
    orderBy: { sortOrder: "asc" },
  });

  const wheel = await prisma.wheel.update({
    where: { id: wheelId },
    data: {
      currentWinner: null,
      lastWinnerAt: null,
      spinTargetAngle: null,
      entriesText: entries
        .map((e) => (e.weight > 1 ? `${e.label}:${e.weight}` : e.label))
        .join("\n"),
    },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const payload = serializeWheel(wheel);
  publish(wheelChannel(wheel.id), { type: "update", wheel: payload });
  publish(displayChannel(wheel.displayToken), {
    type: "update",
    wheel: serializeDisplayWheel(wheel),
  });
  return payload;
}

export async function regenerateDisplayToken(wheelId: string) {
  const { nanoid } = await import("nanoid");
  const refreshed = await prisma.wheel.update({
    where: { id: wheelId },
    data: { displayToken: nanoid(24) },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  return serializeWheel(refreshed);
}

export async function regenerateWebhookSecret(wheelId: string) {
  const { nanoid } = await import("nanoid");
  const refreshed = await prisma.wheel.update({
    where: { id: wheelId },
    data: { webhookSecret: nanoid(32) },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      winners: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  return serializeWheel(refreshed);
}
