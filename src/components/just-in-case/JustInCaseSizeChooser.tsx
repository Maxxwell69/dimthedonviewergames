"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";

type OverlayPaths = {
  cases: string;
  player: string;
  offer: string;
  full: string;
};

type SessionPayload = {
  token?: string;
  overlays?: {
    widescreen: OverlayPaths;
    vertical: OverlayPaths;
  };
  error?: string;
};

export function JustInCaseSizeChooser() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/just-in-case/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: SessionPayload) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession({ error: "Could not load public overlay links" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copy(path: string, label: string) {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote(`Copied ${label}`);
    } catch {
      setNote(url);
    }
    window.setTimeout(() => setNote(null), 2500);
  }

  async function rotateLinks() {
    setBusy(true);
    try {
      const res = await fetch("/api/just-in-case/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotate: true }),
      });
      const data = (await res.json()) as SessionPayload;
      if (!res.ok) throw new Error(data.error || "Could not rotate links");
      setSession(data);
      setNote("Public overlay links rotated");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Rotate failed");
    } finally {
      setBusy(false);
      window.setTimeout(() => setNote(null), 2500);
    }
  }

  return (
    <div className="home-shell">
      <div className="home-top">
        <BrandHeader compact showBanner={false} />
        <div className="home-user">
          <Link className="btn ghost" href="/dashboard">
            ← Back to dashboard
          </Link>
        </div>
      </div>

      <header className="home-hero">
        <h1>Just in Case</h1>
        <p>Choose the game size before you enter. Public OBS overlays are listed below.</p>
      </header>

      <section className="panel studio-games-panel">
        <h2>Choose size</h2>
        <p className="hint">Pick the layout that matches your stream / OBS canvas.</p>
        <div className="studio-games-grid size-chooser-grid">
          <article className="studio-game-card size-choice-card">
            <div className="size-preview landscape" aria-hidden="true">
              <span />
            </div>
            <div>
              <h3>16:9 Widescreen</h3>
              <p>Desktop host view and landscape OBS. Best for monitor / horizontal canvases.</p>
            </div>
            <Link className="btn gold" href="/dashboard/just-in-case/widescreen">
              Enter 16:9 host
            </Link>
          </article>

          <article className="studio-game-card size-choice-card">
            <div className="size-preview portrait" aria-hidden="true">
              <span />
            </div>
            <div>
              <h3>9:16 Vertical</h3>
              <p>TikTok / phone portrait OBS. Best for vertical live canvases.</p>
            </div>
            <Link className="btn gold" href="/dashboard/just-in-case/vertical">
              Enter 9:16 host
            </Link>
          </article>
        </div>
      </section>

      <section className="panel studio-games-panel">
        <h2>Public OBS overlays</h2>
        <p className="hint">
          No login required. Paste these into OBS browser sources. They sync from your host game
          page.
        </p>

        {!session ? <p className="hint">Loading public links…</p> : null}
        {session?.error ? <p className="hint">{session.error}</p> : null}

        {session?.overlays ? (
          <div className="studio-games-grid size-chooser-grid">
            <article className="studio-game-card">
              <div>
                <h3>16:9 public links</h3>
                <p className="hint overlay-path">{session.overlays.widescreen.full}</p>
              </div>
              <div className="btn-row wrap">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copy(session.overlays!.widescreen.cases, "16:9 briefcases")}
                >
                  Copy briefcases
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copy(session.overlays!.widescreen.player, "16:9 your case")}
                >
                  Copy your case
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copy(session.overlays!.widescreen.offer, "16:9 offer")}
                >
                  Copy Dom’s offer
                </button>
              </div>
            </article>

            <article className="studio-game-card">
              <div>
                <h3>9:16 public links</h3>
                <p className="hint overlay-path">{session.overlays.vertical.full}</p>
              </div>
              <div className="btn-row wrap">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copy(session.overlays!.vertical.cases, "9:16 briefcases")}
                >
                  Copy briefcases
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copy(session.overlays!.vertical.player, "9:16 your case")}
                >
                  Copy your case
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copy(session.overlays!.vertical.offer, "9:16 offer")}
                >
                  Copy Dom’s offer
                </button>
              </div>
            </article>
          </div>
        ) : null}

        <div className="btn-row" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn ghost" disabled={busy} onClick={() => void rotateLinks()}>
            Rotate public links
          </button>
        </div>
        {note ? <p className="hint">{note}</p> : null}
      </section>
    </div>
  );
}
