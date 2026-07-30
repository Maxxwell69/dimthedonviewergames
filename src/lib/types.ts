export type WheelEntryDTO = {
  id: string;
  label: string;
  weight: number;
  source: string;
  tiktokUsername: string | null;
};

export type WinnerDTO = {
  id: string;
  label: string;
  createdAt: string;
};

export type WheelDesignDTO = {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  hubImageUrl: string | null;
};

export type WheelSummaryDTO = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  entryCount: number;
  updatedAt: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
};

export type WheelDTO = {
  id: string;
  title: string;
  description?: string;
  isActive?: boolean;
  displayToken?: string;
  webhookSecret?: string;
  removeOnWin: boolean;
  spinDurationMs: number;
  soundEnabled: boolean;
  celebrateEnabled: boolean;
  spinVolume: number;
  celebrateVolume: number;
  allowDuplicates?: boolean;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  hubImageUrl?: string | null;
  isSpinning: boolean;
  spinStartedAt: string | null;
  spinEndsAt: string | null;
  spinTargetAngle: number | null;
  currentWinner: string | null;
  lastWinnerAt: string | null;
  entriesText?: string;
  entries: WheelEntryDTO[];
  winners: WinnerDTO[];
  updatedAt: string;
};

export const DEFAULT_WHEEL_COLORS = {
  colorPrimary: "#5c0a14",
  colorSecondary: "#0a0a0a",
  colorAccent: "#c9a24d",
} as const;

export function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 80;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}
