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

export type WheelDTO = {
  id: string;
  title: string;
  displayToken?: string;
  webhookSecret?: string;
  removeOnWin: boolean;
  spinDurationMs: number;
  soundEnabled: boolean;
  celebrateEnabled: boolean;
  spinVolume: number;
  celebrateVolume: number;
  allowDuplicates?: boolean;
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

export function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 80;
  return Math.max(0, Math.min(100, Math.round(value)));
}
