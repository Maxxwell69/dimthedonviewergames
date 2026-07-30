"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { DonWheel } from "@/components/DonWheel";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import type { WheelDTO } from "@/lib/types";

type DisplayClientProps = {
  token: string;
  initialWheel: WheelDTO;
};

export function DisplayClient({ token, initialWheel }: DisplayClientProps) {
  const searchParams = useSearchParams();
  const overlay =
    searchParams.get("overlay") === "1" ||
    searchParams.get("bare") === "1" ||
    searchParams.get("wheelonly") === "1";

  const [wheel, setWheel] = useState(initialWheel);
  const [showWinner, setShowWinner] = useState(
    Boolean(initialWheel.currentWinner && !initialWheel.isSpinning),
  );
  const [wheelSize, setWheelSize] = useState(520);

  useEffect(() => {
    document.documentElement.classList.toggle("overlay-mode", overlay);
    document.body.classList.toggle("overlay-mode", overlay);
    return () => {
      document.documentElement.classList.remove("overlay-mode");
      document.body.classList.remove("overlay-mode");
    };
  }, [overlay]);

  useEffect(() => {
    const resize = () => {
      if (overlay) {
        setWheelSize(
          Math.min(
            window.innerWidth,
            window.innerHeight,
            Math.max(280, Math.min(window.innerWidth, window.innerHeight) - 24),
          ),
        );
      } else {
        setWheelSize(
          Math.min(640, Math.max(280, Math.min(window.innerWidth, window.innerHeight) - 160)),
        );
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [overlay]);

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
    <div className={`display-shell ${overlay ? "overlay-mode" : ""}`}>
      {!overlay ? (
        <>
          <BrandHeader showBanner={false} />
          <h1 className="display-title">{wheel.title}</h1>
          <p className="display-count">{wheel.entries.length} entered · type !enter in chat</p>
        </>
      ) : null}

      <DonWheel
        entries={wheel.entries}
        isSpinning={wheel.isSpinning}
        targetAngle={wheel.spinTargetAngle}
        spinDurationMs={wheel.spinDurationMs}
        spinStartedAt={wheel.spinStartedAt}
        soundEnabled={wheel.soundEnabled}
        spinVolume={wheel.spinVolume ?? 80}
        onSpinComplete={() => setShowWinner(true)}
        size={wheelSize}
      />

      {!overlay ? (
        <div className="viewer-banner">
          <span>★</span>
          <strong>VIEWER GAMES</strong>
          <span>★</span>
        </div>
      ) : null}

      <WinnerOverlay
        winner={wheel.currentWinner}
        visible={showWinner && !wheel.isSpinning}
        celebrateEnabled={wheel.celebrateEnabled ?? true}
        celebrateVolume={wheel.celebrateVolume ?? 95}
      />
    </div>
  );
}
