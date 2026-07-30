"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type WinnerOverlayProps = {
  winner: string | null;
  visible: boolean;
  celebrateEnabled?: boolean;
  celebrateVolume?: number;
  onDismiss?: () => void;
  showControls?: boolean;
};

export function WinnerOverlay({
  winner,
  visible,
  celebrateEnabled = true,
  celebrateVolume = 95,
  onDismiss,
  showControls = false,
}: WinnerOverlayProps) {
  const celebratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !winner) {
      celebratedFor.current = null;
      return;
    }

    if (celebratedFor.current === winner) return;
    celebratedFor.current = winner;

    if (!celebrateEnabled) return;

    const colors = ["#c9a24d", "#e8d08a", "#9b1524", "#ffffff", "#5c0a14"];
    const defaults = { colors, disableForReducedMotion: true };

    confetti({
      ...defaults,
      particleCount: 120,
      spread: 80,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.55 },
    });

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 70,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
      });
      confetti({
        ...defaults,
        particleCount: 70,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
      });
    }, 220);

    const cheer = new Audio("/sounds/winner-cheer.mp3");
    cheer.volume = Math.max(0, Math.min(1, celebrateVolume / 100));
    void cheer.play().catch(() => undefined);
  }, [visible, winner, celebrateEnabled, celebrateVolume]);

  if (!visible || !winner) return null;

  return (
    <div className="winner-overlay">
      <div className="winner-card">
        <p className="winner-kicker">Selected</p>
        <h2 className="winner-name">{winner}</h2>
        {showControls ? (
          <button type="button" className="btn gold" onClick={onDismiss}>
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
