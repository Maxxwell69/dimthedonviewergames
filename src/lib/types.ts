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
