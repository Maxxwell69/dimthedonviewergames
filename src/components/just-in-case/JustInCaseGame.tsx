"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const RATIOS = [
  0.000001, 0.000005, 0.00001, 0.000025, 0.00005, 0.0001, 0.00025, 0.0005,
  0.00075, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1,
];
const ROUNDS = [6, 5, 4, 3, 2, 1];
const SYNC_KEY = "dom-the-don-shared-game-v1";
const ZONE_BG_KEY_VAULT = "dom-the-don-zone-bgs-vault-v1";
const ZONE_BG_KEY_DOM = "dom-the-don-zone-bgs-dom-v1";

type Phase = "choose" | "opening" | "offer" | "final" | "finished";
type Case = { id: number; value: number };
type SoundFile = { name: string; url: string } | null;
type ImageFile = { name: string; url: string } | null;
type ZoneBgKind = "player" | "dom" | "stage";
type OverlayView = "full" | "cases" | "player" | "offer";

const DOM_ZONE_DEFAULTS: Record<ZoneBgKind, NonNullable<ImageFile>> = {
  player: {
    name: "Your Case Stage",
    url: "/assets/just-in-case/dom/your-case-stage.png",
  },
  dom: {
    name: "City Skyline",
    url: "/assets/just-in-case/dom/city-skyline.png",
  },
  stage: {
    name: "Cases Stage",
    url: "/assets/just-in-case/dom/cases-stage.png",
  },
};
type SharedGame = {
  max: number;
  draft: number;
  values: number[];
  cases: Case[];
  reserved: number | null;
  opened: number[];
  round: number;
  roundCount: number;
  phase: Phase;
  offer: number;
  result: string;
  revealing: number | null;
};

export type JustInCaseVariant = "landscape" | "portrait";
/** host = dashboard operator; open = public playable; viewer = public overlay follow */
export type JustInCaseMode = "host" | "open" | "viewer";
export type JustInCaseTheme = "vault" | "dom";

const ROOM_KEY = "dom-the-don-public-room-v1";

type OverlayPaths = {
  cases: string;
  player: string;
  offer: string;
  full: string;
};

type OverlayPacks = {
  widescreen: OverlayPaths;
  vertical: OverlayPaths;
  vault: {
    widescreen: OverlayPaths;
    vertical: OverlayPaths;
  };
};

const chips = (n: number) => `◆ ${Math.round(n).toLocaleString()}`;

function ladder(max: number) {
  let last = 0;
  return RATIOS.map((r, i) => {
    if (i === 19) return max;
    const v = Math.max(last + 1, Math.round(max * r));
    last = v;
    return v;
  });
}

function shuffle(values: number[]): Case[] {
  return [...values]
    .sort(() => Math.random() - 0.5)
    .map((value, i) => ({ id: i + 1, value }));
}

function domsOffer(values: number[], round: number) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const high = Math.max(...values);
  const leverage = high > avg * 4 ? 0.88 : 1;
  const patience = 0.54 + Math.min(round, 6) * 0.06;
  return Math.max(1, Math.round((avg * leverage * patience) / 10) * 10);
}

type JustInCaseGameProps = {
  variant?: JustInCaseVariant;
  theme?: JustInCaseTheme;
  mode?: JustInCaseMode;
  publicToken?: string;
};

export function JustInCaseGame({
  variant = "landscape",
  theme = "dom",
  mode = "host",
  publicToken,
}: JustInCaseGameProps) {
  const isVaultTheme = theme === "vault";
  const isDomTheme = theme === "dom";
  const rootClass = [
    variant === "portrait" ? "just-in-case-vertical" : "just-in-case",
    isDomTheme ? "theme-dom" : "theme-vault",
  ].join(" ");
  const layoutKey = variant === "portrait" ? "vertical" : "widescreen";
  const layoutPath = isVaultTheme ? `vault/${layoutKey}` : layoutKey;
  const zoneBgKey = isDomTheme ? ZONE_BG_KEY_DOM : ZONE_BG_KEY_VAULT;
  const isHost = mode === "host";
  const isViewerMode = mode === "viewer";
  const labels = isVaultTheme
    ? {
        banker: "BANKER",
        offer: "BANKER’S OFFER",
        care: "IN BANKER’S CARE",
        footer: "THE BANKER ALWAYS SETTLES THE BOOKS",
        offerCopy: "Banker’s Offer",
        seal: "BK",
        offering: "The banker is making you an offer…",
        paid: (offerAmt: string, caseAmt: string) =>
          `Banker paid ${offerAmt} · Your case held ${caseAmt}`,
      }
    : {
        banker: "DOM THE DON",
        offer: "DOM’S OFFER",
        care: "IN DOM’S CARE",
        footer: "DOM ALWAYS SETTLES THE BOOKS",
        offerCopy: "Dom’s Offer",
        seal: "DD",
        offering: "Dom is making you an offer…",
        paid: (offerAmt: string, caseAmt: string) =>
          `Dom paid ${offerAmt} · Your case held ${caseAmt}`,
      };

  const [max, setMax] = useState(1_000_000);
  const [draft, setDraft] = useState(1_000_000);
  const [values, setValues] = useState(() => ladder(1_000_000));
  const [cases, setCases] = useState<Case[]>(() => shuffle(ladder(1_000_000)));
  const [reserved, setReserved] = useState<number | null>(null);
  const [opened, setOpened] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("choose");
  const [offer, setOffer] = useState(0);
  const [offerDisplay, setOfferDisplay] = useState(0);
  const [revealing, setRevealing] = useState<number | null>(null);
  const [result, setResult] = useState("");
  const [setup, setSetup] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [fxOn, setFxOn] = useState(!isViewerMode);
  const [music, setMusic] = useState<SoundFile>(null);
  const [offerSound, setOfferSound] = useState<SoundFile>(null);
  const [finalSound, setFinalSound] = useState<SoundFile>(null);
  const [playerBg, setPlayerBg] = useState<ImageFile>(
    isDomTheme ? DOM_ZONE_DEFAULTS.player : null,
  );
  const [domBg, setDomBg] = useState<ImageFile>(isDomTheme ? DOM_ZONE_DEFAULTS.dom : null);
  const [stageBg, setStageBg] = useState<ImageFile>(
    isDomTheme ? DOM_ZONE_DEFAULTS.stage : null,
  );
  const [overlay, setOverlay] = useState<OverlayView>("full");
  const audioCtx = useRef<AudioContext | null>(null);
  const musicAudio = useRef<HTMLAudioElement | null>(null);
  const musicTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [syncToken, setSyncToken] = useState<string | null>(publicToken ?? null);
  const [overlayPaths, setOverlayPaths] = useState<OverlayPaths | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const applyingRemote = useRef(false);
  const lastAppliedUpdatedAt = useRef<string | null>(null);
  const lastPublishedJson = useRef<string | null>(null);

  const remaining = useMemo(
    () => cases.filter((c) => !opened.includes(c.id)).map((c) => c.value),
    [cases, opened],
  );
  const target = ROUNDS[Math.min(round, ROUNDS.length - 1)];
  const mine = cases.find((c) => c.id === reserved);
  const top = Math.max(...remaining);

  const isOverlayView =
    overlay === "cases" || overlay === "player" || overlay === "offer";
  const isViewer = isViewerMode || isOverlayView;
  const canInteract = !isViewer;

  useEffect(() => {
    setOrigin(window.location.origin);
    const view = new URLSearchParams(window.location.search).get("overlay");
    if (view === "cases" || view === "player" || view === "offer") setOverlay(view);
    try {
      const raw = localStorage.getItem(zoneBgKey);
      if (!raw) {
        if (isDomTheme) {
          setPlayerBg(DOM_ZONE_DEFAULTS.player);
          setDomBg(DOM_ZONE_DEFAULTS.dom);
          setStageBg(DOM_ZONE_DEFAULTS.stage);
        } else {
          setPlayerBg(null);
          setDomBg(null);
          setStageBg(null);
        }
        return;
      }
      const saved = JSON.parse(raw) as {
        player?: ImageFile;
        dom?: ImageFile;
        stage?: ImageFile;
      };
      setPlayerBg(saved.player?.url ? saved.player : isDomTheme ? DOM_ZONE_DEFAULTS.player : null);
      setDomBg(saved.dom?.url ? saved.dom : isDomTheme ? DOM_ZONE_DEFAULTS.dom : null);
      setStageBg(saved.stage?.url ? saved.stage : isDomTheme ? DOM_ZONE_DEFAULTS.stage : null);
    } catch {
      localStorage.removeItem(zoneBgKey);
    }
  }, [zoneBgKey, isDomTheme]);

  function persistZoneBgs(next: {
    player: ImageFile;
    dom: ImageFile;
    stage: ImageFile;
  }) {
    try {
      localStorage.setItem(zoneBgKey, JSON.stringify(next));
    } catch {
      /* quota / private mode — keep in-memory only */
    }
  }

  function setView(view: OverlayView) {
    setOverlay(view);
    const url = new URL(window.location.href);
    if (view === "full") url.searchParams.delete("overlay");
    else url.searchParams.set("overlay", view);
    window.history.replaceState({}, "", url);
  }

  function applyShared(data: SharedGame, updatedAt?: string | null) {
    applyingRemote.current = true;
    if (updatedAt) lastAppliedUpdatedAt.current = updatedAt;
    setMax(data.max);
    setDraft(data.draft);
    setValues(data.values);
    setCases(data.cases);
    setReserved(data.reserved);
    setOpened(data.opened);
    setRound(data.round);
    setRoundCount(data.roundCount);
    setPhase(data.phase);
    setOffer(data.offer);
    setResult(data.result);
    setRevealing(data.revealing);
    lastPublishedJson.current = JSON.stringify(data);
    queueMicrotask(() => {
      applyingRemote.current = false;
    });
  }

  useEffect(() => {
    // Controllers keep a local backup; OBS/viewers only follow the server room.
    if (isViewer) {
      setSyncReady(true);
      return;
    }
    const stored = localStorage.getItem(SYNC_KEY);
    if (stored) {
      try {
        applyShared(JSON.parse(stored) as SharedGame);
      } catch {
        localStorage.removeItem(SYNC_KEY);
      }
    }
    setSyncReady(true);
  }, [isViewer]);

  // Publish local controller changes into the shared DB room.
  useEffect(() => {
    if (isViewer || !syncReady || !syncToken || applyingRemote.current) return;
    const shared: SharedGame = {
      max,
      draft,
      values,
      cases,
      reserved,
      opened,
      round,
      roundCount,
      phase,
      offer,
      result,
      revealing,
    };
    const json = JSON.stringify(shared);
    if (localStorage.getItem(SYNC_KEY) !== json) localStorage.setItem(SYNC_KEY, json);
    if (lastPublishedJson.current === json) return;

    const endpoint = `/api/just-in-case/${syncToken}/state`;
    void fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: json,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { updatedAt?: string };
        lastPublishedJson.current = json;
        if (data.updatedAt) lastAppliedUpdatedAt.current = data.updatedAt;
      })
      .catch(() => {});
  }, [
    isViewer,
    syncReady,
    syncToken,
    max,
    draft,
    values,
    cases,
    reserved,
    opened,
    round,
    roundCount,
    phase,
    offer,
    result,
    revealing,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (publicToken) {
        setSyncToken(publicToken);
        localStorage.setItem(ROOM_KEY, publicToken);
        const res = await fetch(`/api/just-in-case/${publicToken}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          state?: SharedGame | null;
          updatedAt?: string | null;
          overlays?: never;
        };
        if (!cancelled && data.state) applyShared(data.state, data.updatedAt);
        // Still load overlay path helpers for controllers.
        if (!isViewer) {
          setOverlayPaths({
            cases: `/just-in-case/${publicToken}/${layoutPath}?overlay=cases`,
            player: `/just-in-case/${publicToken}/${layoutPath}?overlay=player`,
            offer: `/just-in-case/${publicToken}/${layoutPath}?overlay=offer`,
            full: `/just-in-case/${publicToken}/${layoutPath}`,
          });
        }
        return;
      }

      if (isHost) {
        const res = await fetch("/api/just-in-case/session", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          token?: string;
          overlays?: OverlayPacks;
        };
        if (cancelled || !data.token || !data.overlays) return;
        localStorage.setItem(ROOM_KEY, data.token);
        setSyncToken(data.token);
        setOverlayPaths(
          isVaultTheme ? data.overlays.vault[layoutKey] : data.overlays[layoutKey],
        );
        const next = new URL(window.location.href);
        next.pathname = `/just-in-case/${data.token}/${layoutPath}`;
        window.history.replaceState({}, "", next);
        return;
      }

      // Public open game: reuse local room or create one (no login).
      const existing =
        new URLSearchParams(window.location.search).get("room") ||
        localStorage.getItem(ROOM_KEY);
      const res = await fetch("/api/just-in-case/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: existing || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        overlays?: OverlayPacks;
      };
      if (cancelled || !data.token || !data.overlays) return;
      localStorage.setItem(ROOM_KEY, data.token);
      setSyncToken(data.token);
      setOverlayPaths(
        isVaultTheme ? data.overlays.vault[layoutKey] : data.overlays[layoutKey],
      );
      const next = new URL(window.location.href);
      if (!next.pathname.includes(`/${data.token}/`)) {
        next.pathname = `/just-in-case/${data.token}/${layoutPath}`;
        window.history.replaceState({}, "", next);
      }
    }

    void boot().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isHost, isViewer, publicToken, layoutKey, layoutPath, isVaultTheme]);

  // Poll shared DB state so OBS/TikTok always follow the same room.
  useEffect(() => {
    if (!syncToken) return;
    let cancelled = false;

    async function pull() {
      try {
        const res = await fetch(`/api/just-in-case/${syncToken}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          state?: SharedGame | null;
          updatedAt?: string | null;
        };
        if (!data.state || !data.updatedAt) return;
        if (data.updatedAt === lastAppliedUpdatedAt.current) return;
        // Controllers ignore echoes of their own publishes.
        const remoteJson = JSON.stringify(data.state);
        if (!isViewer && remoteJson === lastPublishedJson.current) {
          lastAppliedUpdatedAt.current = data.updatedAt;
          return;
        }
        applyShared(data.state, data.updatedAt);
      } catch {
        /* ignore transient poll errors */
      }
    }

    void pull();
    const id = window.setInterval(() => void pull(), 700);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [syncToken, isViewer]);

  async function copyOverlay(path: string, label: string) {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyNote(`Copied ${label} URL`);
    } catch {
      setCopyNote(url);
    }
    window.setTimeout(() => setCopyNote(null), 2500);
  }

  function openPublicOverlay(view: Exclude<OverlayView, "full">) {
    if (!overlayPaths) return;
    const path = overlayPaths[view];
    window.open(path, "_blank", "noopener,noreferrer");
  }

  function context() {
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
      setAudioReady(true);
    }
    if (audioCtx.current.state === "suspended") void audioCtx.current.resume();
    return audioCtx.current;
  }

  function tone(
    f: number,
    d = 0.2,
    v = 0.07,
    type: OscillatorType = "triangle",
    delay = 0,
  ) {
    if (!fxOn) return;
    const c = context();
    const o = c.createOscillator();
    const g = c.createGain();
    const s = c.currentTime + delay;
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(v, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(g).connect(c.destination);
    o.start(s);
    o.stop(s + d + 0.03);
  }

  function play(url: string, volume = 0.8) {
    if (!fxOn) return;
    const a = new Audio(url);
    a.volume = volume;
    void a.play().catch(() => {});
  }

  function sfx(kind: "select" | "open" | "offer" | "deal" | "no" | "final") {
    if (kind === "select") {
      tone(330);
      tone(495, 0.2, 0.05, "triangle", 0.1);
    }
    if (kind === "open") {
      tone(90, 0.3, 0.1, "square");
      tone(622, 0.25, 0.05, "triangle", 0.15);
    }
    if (kind === "offer") {
      if (offerSound) play(offerSound.url);
      else [392, 494, 587].forEach((n, i) => tone(n, 0.25, 0.05, "sine", i * 0.18));
    }
    if (kind === "deal")
      [330, 440, 554, 659].forEach((n, i) => tone(n, 0.35, 0.07, "triangle", i * 0.1));
    if (kind === "no") {
      tone(82, 0.4, 0.1, "sawtooth");
      tone(65, 0.45, 0.08, "square", 0.12);
    }
    if (kind === "final") {
      if (finalSound) play(finalSound.url, 0.9);
      else [262, 330, 392, 523].forEach((n, i) => tone(n, 0.5, 0.07, "triangle", i * 0.13));
    }
  }

  useEffect(() => {
    if (musicAudio.current) {
      musicAudio.current.pause();
      musicAudio.current = null;
    }
    if (musicTimer.current) {
      clearInterval(musicTimer.current);
      musicTimer.current = null;
    }
    if (!musicOn || !audioReady) return;
    if (music) {
      const a = new Audio(music.url);
      a.loop = true;
      a.volume = 0.3;
      musicAudio.current = a;
      void a.play().catch(() => {});
      return () => a.pause();
    }
    const notes = [110, 146.8, 164.8, 123.5, 146.8, 110];
    let i = 0;
    const note = () => {
      const c = audioCtx.current;
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      const n = c.currentTime;
      o.type = "sine";
      o.frequency.value = notes[i++ % notes.length];
      g.gain.setValueAtTime(0.0001, n);
      g.gain.exponentialRampToValueAtTime(0.016, n + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, n + 0.7);
      o.connect(g).connect(c.destination);
      o.start(n);
      o.stop(n + 0.75);
    };
    note();
    musicTimer.current = setInterval(note, 760);
    return () => {
      if (musicTimer.current) clearInterval(musicTimer.current);
    };
  }, [musicOn, audioReady, music]);

  useEffect(() => {
    if (phase !== "offer" || !offer) return;
    sfx("offer");
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setOfferDisplay(Math.round(offer * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, offer]);

  function select(id: number) {
    if (!canInteract || phase !== "choose") return;
    setReserved(id);
    setPhase("opening");
    sfx("select");
  }

  function open(id: number) {
    if (
      !canInteract ||
      phase !== "opening" ||
      id === reserved ||
      opened.includes(id) ||
      revealing !== null
    )
      return;
    setRevealing(id);
    sfx("open");
    setTimeout(() => {
      const next = [...opened, id];
      const count = roundCount + 1;
      setOpened(next);
      setRoundCount(count);
      setRevealing(null);
      if (count >= target) {
        const left = cases.filter((c) => !next.includes(c.id)).map((c) => c.value);
        setOffer(domsOffer(left, round));
        setPhase("offer");
      }
    }, 650);
  }

  function noDeal() {
    if (!canInteract) return;
    if (remaining.length <= 2) {
      setPhase("final");
      sfx("final");
      setTimeout(() => {
        setResult(`Your briefcase held ${chips(mine?.value ?? 0)}.`);
        setPhase("finished");
      }, 1800);
      return;
    }
    setRound((r) => r + 1);
    setRoundCount(0);
    setOffer(0);
    setPhase("opening");
    sfx("no");
  }

  function deal() {
    if (!canInteract) return;
    setPhase("final");
    sfx("deal");
    setTimeout(() => {
      setResult(labels.paid(chips(offer), chips(mine?.value ?? 0)));
      setPhase("finished");
    }, 1800);
  }

  function reset(nextValues = values) {
    if (!canInteract) return;
    setCases(shuffle(nextValues));
    setReserved(null);
    setOpened([]);
    setRound(0);
    setRoundCount(0);
    setPhase("choose");
    setOffer(0);
    setOfferDisplay(0);
    setResult("");
    setRevealing(null);
  }

  function save() {
    if (!canInteract) return;
    const safe = Math.max(100, Math.min(1e9, Math.round(draft || 100)));
    const next = ladder(safe);
    setMax(safe);
    setDraft(safe);
    setValues(next);
    reset(next);
    setSetup(false);
  }

  function file(kind: "music" | "offer" | "final", f?: File) {
    if (!f) return;
    const next = { name: f.name, url: URL.createObjectURL(f) };
    const old = kind === "music" ? music : kind === "offer" ? offerSound : finalSound;
    if (old) URL.revokeObjectURL(old.url);
    if (kind === "music") setMusic(next);
    else if (kind === "offer") setOfferSound(next);
    else setFinalSound(next);
  }

  function setZoneBg(kind: ZoneBgKind, next: ImageFile) {
    const player = kind === "player" ? next : playerBg;
    const dom = kind === "dom" ? next : domBg;
    const stage = kind === "stage" ? next : stageBg;
    if (kind === "player") setPlayerBg(next);
    else if (kind === "dom") setDomBg(next);
    else setStageBg(next);
    persistZoneBgs({ player, dom, stage });
  }

  function clearZoneBg(kind: ZoneBgKind) {
    setZoneBg(kind, isDomTheme ? DOM_ZONE_DEFAULTS[kind] : null);
  }

  function imageFile(kind: ZoneBgKind, f?: File) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (!url) return;
      setZoneBg(kind, { name: f.name, url });
    };
    reader.readAsDataURL(f);
  }

  const status =
    phase === "choose"
      ? "Choose the briefcase you keep"
      : phase === "opening"
        ? `Open ${target - roundCount} briefcase${target - roundCount === 1 ? "" : "s"}`
        : phase === "offer"
          ? labels.offering
          : phase === "final"
            ? "Opening your final briefcase…"
            : "The sit-down is over";

  const otherLayoutHref = isVaultTheme
    ? variant === "portrait"
      ? "/just-in-case/vault/widescreen"
      : "/just-in-case/vault/vertical"
    : variant === "portrait"
      ? "/just-in-case/widescreen"
      : "/just-in-case/vertical";
  const otherLayoutLabel = variant === "portrait" ? "16:9 LAYOUT" : "9:16 LAYOUT";

  return (
    <div className={rootClass}>
      <main className={`game overlay-${overlay}`} onPointerDown={canInteract ? context : undefined}>
        {canInteract ? (
          <div className="top-tools">
            <div>
              <Link className="admin-exit" href="/just-in-case">
                ← SIZE
              </Link>
              {isHost ? (
                <Link className="admin-exit" href="/dashboard">
                  DASHBOARD
                </Link>
              ) : null}
              <Link className="admin-exit" href={otherLayoutHref}>
                {otherLayoutLabel}
              </Link>
              <button className={fxOn ? "on" : ""} onClick={() => setFxOn((v) => !v)}>
                🔊 FX
              </button>
            </div>
            <div>
              <button
                className="restart"
                onClick={() => reset()}
                title="Shuffle all briefcases and start over"
              >
                ↻ RESTART GAME
              </button>
              <button onClick={() => setSetup(true)}>⚙ OWNER SETUP</button>
            </div>
          </div>
        ) : null}

        {canInteract && overlay !== "full" ? (
          <button className="overlay-exit" onClick={() => setView("full")}>
            ← FULL GAME
          </button>
        ) : null}

        <section className="board">
          <aside className="player panel">
            <h2>YOUR BRIEFCASE</h2>
            <div className="club-seal">{labels.seal}</div>
            <div className={`player-stage ${playerBg ? "has-zone-bg" : ""}`}>
              {playerBg ? (
                <div
                  className="zone-bg"
                  style={{ backgroundImage: `url(${playerBg.url})` }}
                  aria-hidden
                />
              ) : null}
              {mine ? (
                <Briefcase
                  c={mine}
                  selected
                  opened={phase === "final" || phase === "finished"}
                  revealing={phase === "final"}
                  careLabel={labels.care}
                />
              ) : (
                <div className="empty">
                  ?
                  <small>Waiting on your choice</small>
                </div>
              )}
            </div>
            {(phase === "final" || phase === "finished") && (
              <div className="verdict">
                {phase === "final" ? "THE LOCK IS TURNING…" : result}
              </div>
            )}
            <div className="odds">
              <small>TOP CASE ODDS</small>
              <strong>{reserved ? Math.round(100 / remaining.length) : 0}%</strong>
              <span>{remaining.length} sealed briefcases</span>
            </div>
          </aside>

          <section className="stage panel">
            <div className="instruction">◆ {status} ◆</div>
            <div className={`cases ${stageBg ? "has-zone-bg" : ""}`}>
              {stageBg ? (
                <div
                  className="zone-bg"
                  style={{ backgroundImage: `url(${stageBg.url})` }}
                  aria-hidden
                />
              ) : null}
              {cases.map((c) => (
                <Briefcase
                  key={c.id}
                  c={c}
                  opened={opened.includes(c.id)}
                  hidden={c.id === reserved}
                  revealing={revealing === c.id}
                  careLabel={labels.care}
                  onClick={
                    canInteract
                      ? () => (phase === "choose" ? select(c.id) : open(c.id))
                      : undefined
                  }
                />
              ))}
            </div>
            <div className="prizes">
              {values.map((v) => (
                <span
                  key={v}
                  className={!remaining.includes(v) ? "gone" : v === top ? "top" : ""}
                >
                  {chips(v)}
                </span>
              ))}
            </div>
          </section>

          <aside className={`dom panel ${phase === "offer" ? "calling" : ""}`}>
            <h2>{labels.banker}</h2>
            <div
              className={`portrait ${domBg ? "has-custom-bg" : "camera-slot"}`}
              style={
                domBg
                  ? {
                      backgroundImage: `url(${domBg.url})`,
                    }
                  : undefined
              }
              aria-label={domBg ? `${labels.banker} backdrop` : "Blank camera overlay area"}
            />
            <div className="offer-label">{labels.offer}</div>
            <div className={`offer ${phase === "offer" ? "active" : ""}`}>
              {offer ? chips(phase === "offer" ? offerDisplay : offer) : "—"}
            </div>
            <div className="stats">
              <span>
                CASES LEFT<strong>{remaining.length}</strong>
              </span>
              <span>
                TOP CASE<strong>{chips(top)}</strong>
              </span>
            </div>
            <button
              className="take"
              disabled={!canInteract || phase !== "offer"}
              onClick={deal}
            >
              TAKE THE DEAL
            </button>
            <button
              className="walk"
              disabled={!canInteract || phase !== "offer"}
              onClick={noDeal}
            >
              NO DEAL
            </button>
          </aside>
        </section>

        <footer>
          <p>
            {phase === "finished" ? labels.footer : `MAXIMUM CASE ${chips(max)}`}
          </p>
          {phase === "finished" && canInteract ? (
            <button onClick={() => reset()}>ANOTHER SIT-DOWN</button>
          ) : null}
        </footer>

        {setup && canInteract ? (
          <div className="modal-bg">
            <div className="modal panel">
              <button className="close" onClick={() => setSetup(false)}>
                ×
              </button>
              <small className="eyebrow">THE BACK OFFICE</small>
              <h2>OWNER SETUP</h2>
              <label>
                Highest case in diamonds
                <input
                  type="number"
                  min={100}
                  max={1_000_000_000}
                  value={draft}
                  onChange={(e) => setDraft(Number(e.target.value))}
                />
              </label>
              <div className="preview">
                <small>TOP BRIEFCASE</small>
                <strong>{chips(Math.max(100, draft || 100))}</strong>
              </div>
              <h3>ZONE BACKDROPS</h3>
              <p className="overlay-url-hint">
                {isDomTheme
                  ? "Dom neon stage ships with default backdrops. Swap images for Your Case, Dom’s box, and the briefcases stage anytime."
                  : "Optional images behind Your Case, the Banker box, and the briefcases stage. Saved in this browser for OBS on the same machine."}
              </p>
              <Upload
                label="Your Case Background"
                value={playerBg}
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                hint="PNG, JPG, WEBP, or GIF"
                onFile={(f) => imageFile("player", f)}
                onClear={() => clearZoneBg("player")}
              />
              <Upload
                label={`${labels.banker} Box Background`}
                value={domBg}
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                hint="PNG, JPG, WEBP, or GIF — replaces blank camera box"
                onFile={(f) => imageFile("dom", f)}
                onClear={() => clearZoneBg("dom")}
              />
              <Upload
                label="Briefcases Stage Background"
                value={stageBg}
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                hint="PNG, JPG, WEBP, or GIF"
                onFile={(f) => imageFile("stage", f)}
                onClear={() => clearZoneBg("stage")}
              />
              <h3>CUSTOM SHOW AUDIO</h3>
              <label className="music-toggle">
                <input
                  type="checkbox"
                  checked={musicOn}
                  onChange={(e) => setMusicOn(e.target.checked)}
                />
                Enable background music (off by default)
              </label>
              <Upload label="Background Music" value={music} onFile={(f) => file("music", f)} />
              <Upload
                label={`${labels.offerCopy} Sound`}
                value={offerSound}
                onFile={(f) => file("offer", f)}
              />
              <Upload
                label="Final Celebration"
                value={finalSound}
                onFile={(f) => file("final", f)}
              />
              <div className="overlay-admin">
                <h3>TIKTOK / OBS PUBLIC URLS</h3>
                <p>
                  Use these only — they never ask for login. Copy them from THIS game session so OBS
                  uses the same room token as your browser. Do not paste /dashboard or /login links.
                </p>
                {overlayPaths ? (
                  <>
                    <p className="overlay-url-hint">
                      Full game (public):{" "}
                      <code>
                        {origin ? `${origin}${overlayPaths.full}` : overlayPaths.full}
                      </code>
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => void copyOverlay(overlayPaths.full, "Full game")}
                      >
                        COPY FULL GAME
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyOverlay(overlayPaths.cases, "Briefcases")}
                      >
                        COPY BRIEFCASES
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyOverlay(overlayPaths.player, "Your Case")}
                      >
                        COPY YOUR CASE
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyOverlay(overlayPaths.offer, labels.offerCopy)}
                      >
                        {`COPY ${labels.offerCopy.toUpperCase()}`}
                      </button>
                    </div>
                    <div>
                      <button type="button" onClick={() => openPublicOverlay("cases")}>
                        OPEN BRIEFCASES
                      </button>
                      <button type="button" onClick={() => openPublicOverlay("player")}>
                        OPEN YOUR CASE
                      </button>
                      <button type="button" onClick={() => openPublicOverlay("offer")}>
                        {`OPEN ${labels.offerCopy.toUpperCase()}`}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="overlay-url-hint">Loading public overlay links…</p>
                )}
                {copyNote ? <p className="overlay-url-hint">{copyNote}</p> : null}
              </div>
              <button className="save" onClick={save}>
                SAVE & START THE SIT-DOWN
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Upload({
  label,
  value,
  onFile,
  onClear,
  accept = "audio/*,.mp3,.wav,.m4a,.ogg",
  hint = "MP3, WAV, M4A, or OGG",
}: {
  label: string;
  value: SoundFile | ImageFile;
  onFile: (f?: File) => void;
  onClear?: () => void;
  accept?: string;
  hint?: string;
}) {
  return (
    <div className="upload-row">
      <label className="upload">
        <span>
          <b>
            {value ? "✓ " : ""}
            {label}
          </b>
          <small>{value?.name ?? hint}</small>
        </span>
        <em>{value ? "CHANGE" : "UPLOAD"}</em>
        <input
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {value && onClear ? (
        <button type="button" className="upload-clear" onClick={onClear}>
          CLEAR
        </button>
      ) : null}
    </div>
  );
}

function Briefcase({
  c,
  opened,
  selected,
  hidden,
  revealing,
  careLabel = "IN DOM’S CARE",
  onClick,
}: {
  c: Case;
  opened?: boolean;
  selected?: boolean;
  hidden?: boolean;
  revealing?: boolean;
  careLabel?: string;
  onClick?: () => void;
}) {
  if (hidden) return <div className="brief-slot">{careLabel}</div>;
  return (
    <button
      className={`briefcase ${opened ? "opened" : ""} ${selected ? "selected" : ""} ${revealing ? "revealing" : ""}`}
      disabled={opened || !onClick}
      onClick={onClick}
      aria-label={
        opened ? `Briefcase ${c.id}, ${chips(c.value)}` : `Choose briefcase ${c.id}`
      }
    >
      <i className="handle" />
      <span>{opened || revealing ? chips(c.value) : c.id}</span>
      <b className="lock">◆</b>
    </button>
  );
}
