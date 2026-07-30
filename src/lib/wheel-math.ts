export type WeightedEntry = {
  id: string;
  label: string;
  weight: number;
};

export function normalizeLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed.replace(/^@+/, "")}`;
}

export function parseEntriesText(text: string): { label: string; weight: number }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const weightMatch = line.match(/^(.*?)(?::\s*|,\s*|x)(\d+)\s*$/i);
      if (weightMatch) {
        const label = normalizeLabel(weightMatch[1]);
        const weight = Math.max(1, Number(weightMatch[2]) || 1);
        return { label, weight };
      }
      return { label: normalizeLabel(line), weight: 1 };
    })
    .filter((e) => e.label.length > 1);
}

export function pickWeightedIndex(entries: WeightedEntry[], random = Math.random()) {
  const total = entries.reduce((sum, e) => sum + Math.max(1, e.weight), 0);
  let ticket = random * total;
  for (let i = 0; i < entries.length; i++) {
    ticket -= Math.max(1, entries[i].weight);
    if (ticket <= 0) return i;
  }
  return entries.length - 1;
}

/** Pointer is at top (12 o'clock). Segment 0 starts at -90deg in canvas terms after rotation. */
export function targetAngleForIndex(
  winnerIndex: number,
  entries: WeightedEntry[],
  spins = 6,
) {
  const totalWeight = entries.reduce((sum, e) => sum + Math.max(1, e.weight), 0);
  let start = 0;
  for (let i = 0; i < winnerIndex; i++) {
    start += (Math.max(1, entries[i].weight) / totalWeight) * 360;
  }
  const segmentSize = (Math.max(1, entries[winnerIndex].weight) / totalWeight) * 360;
  const mid = start + segmentSize / 2;
  // Wheel rotation so that mid lands under the top pointer
  const base = 360 - mid;
  return spins * 360 + base;
}

export function shuffleArray<T>(items: T[], random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
