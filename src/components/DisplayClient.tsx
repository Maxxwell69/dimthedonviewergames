"use client";

import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { DonWheel } from "@/components/DonWheel";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import type { WheelDTO } from "@/lib/types";

type DisplayClientProps = {
  token: string;
  initialWheel: WheelDTO;
};

export function DisplayClient({ token, initialWheel }: DisplayClientProps) {
  const [wheel, setWheel] = useState(initialWheel);
  const [showWinner, setShowWinner] = useState(
    Boolean(initialWheel.currentWinner && !initialWheel.isSpinning),
  );
  const [wheelSize, setWheelSize] = useState(520);

  useEffect(() => {
    const resize = () =>
      setWheelSize(
        Math.min(640, Math.max(280, Math.min(window.innerWidth, window.innerHeight) - 160)),
      );
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/display/${token}/stream`);
    es.addEventListener("wheel", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          type: string;
          wheel: WheelDTO;
        };
        setWheel(payload.wheel);
        if (payload.type === "spin") setShowWinner(false);
        if (payload.type === "winner") setShowWinner(true);
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, [token]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/display/${token}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { wheel: WheelDTO };
        setWheel((prev) => {
          if (prev.updatedAt === data.wheel.updatedAt) return prev;
          if (data.wheel.currentWinner && !data.wheel.isSpinning) setShowWinner(true);
          if (data.wheel.isSpinning) setShowWinner(false);
          return data.wheel;
        });
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div className="display-shell">
      <BrandHeader showBanner={false} />
      <h1 className="display-title">{wheel.title}</h1>
      <p className="display-count">{wheel.entries.length} entered · type !enter in chat</p>
      <DonWheel
        entries={wheel.entries}
        isSpinning={wheel.isSpinning}
        targetAngle={wheel.spinTargetAngle}
        spinDurationMs={wheel.spinDurationMs}
        spinStartedAt={wheel.spinStartedAt}
        onSpinComplete={() => setShowWinner(true)}
        size={wheelSize}
      />
      <div className="viewer-banner">
        <span>★</span>
        <strong>VIEWER GAMES</strong>
        <span>★</span>
      </div>
      <WinnerOverlay
        winner={wheel.currentWinner}
        visible={showWinner && !wheel.isSpinning}
      />
    </div>
  );
}
