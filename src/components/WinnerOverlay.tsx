"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type WinnerOverlayProps = {
  winner: string | null;
  visible: boolean;
  soundEnabled?: boolean;
  onDismiss?: () => void;
  showControls?: boolean;
};

export function WinnerOverlay({
  winner,
  visible,
  soundEnabled = true,
  onDismiss,
  showControls = false,
}: WinnerOverlayProps) {
  const celebratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !winner) {
      celebratedFor.current = null;
      return;
    }

    // One celebration per winner reveal
    if (celebratedFor.current === winner) return;
    celebratedFor.current = winner;

    // Gold / maroon Dom the Don confetti burst
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

    if (soundEnabled) {
      const cheer = new Audio("/sounds/winner-cheer.mp3");
      cheer.volume = 0.95;
      void cheer.play().catch(() => undefined);
    }
  }, [visible, winner, soundEnabled]);

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
