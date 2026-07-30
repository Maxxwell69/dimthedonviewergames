"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWheelSpinSound } from "@/hooks/useWheelSpinSound";
import { DEFAULT_WHEEL_COLORS } from "@/lib/types";

export type WheelEntry = {
  id: string;
  label: string;
  weight: number;
};

type DonWheelProps = {
  entries: WheelEntry[];
  isSpinning: boolean;
  targetAngle: number | null;
  spinDurationMs: number;
  spinStartedAt?: string | null;
  soundEnabled?: boolean;
  spinVolume?: number;
  onSpinComplete?: () => void;
  size?: number;
  interactive?: boolean;
  onRequestSpin?: () => void;
  /** Skip soft glows that read as a shaded box in OBS / TikTok Studio overlays. */
  cleanOverlay?: boolean;
  colorPrimary?: string;
  colorSecondary?: string;
  colorAccent?: string;
  hubImageUrl?: string | null;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lighten(hex: string, amount = 0.25) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const nums = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  const mixed = nums.map((n) => Math.min(255, Math.round(n + (255 - n) * amount)));
  return `#${mixed.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function DonWheel({
  entries,
  isSpinning,
  targetAngle,
  spinDurationMs,
  spinStartedAt,
  soundEnabled = true,
  spinVolume = 80,
  onSpinComplete,
  size = 520,
  interactive = false,
  onRequestSpin,
  cleanOverlay = false,
  colorPrimary = DEFAULT_WHEEL_COLORS.colorPrimary,
  colorSecondary = DEFAULT_WHEEL_COLORS.colorSecondary,
  colorAccent = DEFAULT_WHEEL_COLORS.colorAccent,
  hubImageUrl = null,
}: DonWheelProps) {
  const [angle, setAngle] = useState(0);
  const [hubLogo, setHubLogo] = useState<HTMLImageElement | null>(null);
  const completedForSpin = useRef<string | null>(null);
  const lastSpinTap = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useWheelSpinSound(isSpinning, spinStartedAt, soundEnabled, spinVolume);

  const segments = useMemo(() => {
    if (!entries.length) {
      return [{ label: "WAITING", weight: 1, color: colorPrimary }];
    }
    return entries.map((entry, index) => ({
      ...entry,
      color: index % 2 === 0 ? colorPrimary : colorSecondary,
    }));
  }, [entries, colorPrimary, colorSecondary]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = hubImageUrl || "/dom-the-don-d.png";
    img.onload = () => setHubLogo(img);
    img.onerror = () => {
      if (hubImageUrl) {
        const fallback = new Image();
        fallback.src = "/dom-the-don-d.png";
        fallback.onload = () => setHubLogo(fallback);
      }
    };
  }, [hubImageUrl]);

  useEffect(() => {
    if (!isSpinning || targetAngle == null || !spinStartedAt) return;

    const startKey = `${spinStartedAt}:${targetAngle}`;
    if (completedForSpin.current === startKey) return;

    const startTs = new Date(spinStartedAt).getTime();
    const duration = Math.max(1000, spinDurationMs);
    let frame = 0;

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - startTs);
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setAngle(targetAngle * eased);

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setAngle(targetAngle);
        completedForSpin.current = startKey;
        onSpinComplete?.();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isSpinning, targetAngle, spinStartedAt, spinDurationMs, onSpinComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.42;
    const accentLight = lighten(colorAccent, 0.35);

    ctx.clearRect(0, 0, size, size);

    if (!cleanOverlay) {
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.25);
      glow.addColorStop(0, `${colorPrimary}59`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
    const rimGrad = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
    rimGrad.addColorStop(0, "#3a2a12");
    rimGrad.addColorStop(0.5, colorAccent);
    rimGrad.addColorStop(1, "#2a1c0a");
    ctx.fillStyle = rimGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();

    const totalWeight = segments.reduce((s, e) => s + Math.max(1, e.weight), 0);
    let startAngle = -Math.PI / 2 + (angle * Math.PI) / 180;

    segments.forEach((segment) => {
      const sweep = (Math.max(1, segment.weight) / totalWeight) * Math.PI * 2;
      const endAngle = startAngle + sweep;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      ctx.strokeStyle = colorAccent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(startAngle) * radius, cy + Math.sin(startAngle) * radius);
      ctx.stroke();

      const mid = startAngle + sweep / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f5f5f5";
      const fontSize = Math.max(10, Math.min(16, radius / (segments.length * 0.45)));
      ctx.font = `700 ${fontSize}px "Segoe UI", Montserrat, sans-serif`;
      const text = segment.label.length > 16 ? `${segment.label.slice(0, 15)}…` : segment.label;
      ctx.fillText(text, radius - 18, fontSize * 0.35);
      ctx.restore();

      startAngle = endAngle;
    });

    const rivets = 24;
    for (let i = 0; i < rivets; i++) {
      const a = (i / rivets) * Math.PI * 2;
      const rx = cx + Math.cos(a) * (radius + 11);
      const ry = cy + Math.sin(a) * (radius + 11);
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = accentLight;
      ctx.fill();
      ctx.strokeStyle = "#5a3d12";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const hubR = radius * 0.22;
    if (!cleanOverlay) {
      ctx.beginPath();
      ctx.arc(cx, cy, hubR + 8, 0, Math.PI * 2);
      ctx.fillStyle = `${colorPrimary}bf`;
      ctx.fill();
    }

    const hubGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, hubR);
    hubGrad.addColorStop(0, "#1a1208");
    hubGrad.addColorStop(1, "#050303");
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = colorAccent;
    ctx.stroke();

    if (hubLogo) {
      const logoSize = hubR * 1.55;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, hubR - 3, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(hubLogo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
      ctx.restore();
    } else {
      ctx.fillStyle = accentLight;
      ctx.font = `800 ${hubR * 0.95}px Georgia, "Times New Roman", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("D", cx, cy + 2);
    }
  }, [angle, segments, size, hubLogo, cleanOverlay, colorPrimary, colorAccent]);

  const requestSpin = () => {
    if (!interactive || isSpinning) return;
    const now = Date.now();
    if (now - lastSpinTap.current < 450) return;
    lastSpinTap.current = now;
    onRequestSpin?.();
  };

  return (
    <div
      className={`wheel-stage ${cleanOverlay ? "wheel-stage-clean" : ""} ${interactive ? "wheel-stage-interactive" : ""}`}
      style={{ width: size, height: size, background: "transparent" }}
    >
      <canvas
        ref={canvasRef}
        className="wheel-canvas"
        style={{ background: "transparent", touchAction: interactive ? "manipulation" : undefined }}
        onClick={requestSpin}
        onPointerUp={(e) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") requestSpin();
        }}
        role={interactive ? "button" : undefined}
        aria-label={interactive ? "Spin the wheel" : "Wheel"}
      />
      <div className="wheel-pointer" aria-hidden>
        <span className="pointer-gem" />
      </div>
    </div>
  );
}
