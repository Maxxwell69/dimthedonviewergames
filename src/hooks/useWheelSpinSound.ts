"use client";

import { useEffect, useRef } from "react";

/** Plays the Dom the Don wheel spin bed while a spin is active. */
export function useWheelSpinSound(
  isSpinning: boolean,
  spinStartedAt: string | null | undefined,
  enabled: boolean,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpinKey = useRef<string | null>(null);

  useEffect(() => {
    const audio = new Audio("/sounds/wheel-spin.mp3");
    audio.preload = "auto";
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled || !isSpinning || !spinStartedAt) {
      audio.pause();
      audio.currentTime = 0;
      if (!isSpinning) lastSpinKey.current = null;
      return;
    }

    const key = spinStartedAt;
    if (lastSpinKey.current === key) return;
    lastSpinKey.current = key;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay can be blocked until a user gesture; dashboard spins usually have one.
    });
  }, [enabled, isSpinning, spinStartedAt]);
}
