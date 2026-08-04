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
    vault: {
      widescreen: OverlayPaths;
      vertical: OverlayPaths;
    };
  };
  error?: string;
};

type Props = {
  publicAccess?: boolean;
};

export function JustInCaseSizeChooser({ publicAccess = false }: Props) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (publicAccess) return;
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
  }, [publicAccess]);

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
          <Link className="btn ghost" href={publicAccess ? "/" : "/dashboard"}>
            {publicAccess ? "← Home" : "← Back to dashboard"}
          </Link>
        </div>
      </div>

      <header className="home-hero">
        <h1>Just in Case</h1>
        <p>
          {publicAccess
            ? "No login needed. Choose a template and size — OBS overlay links are created inside the game."
            : "Choose a template and size before you enter. Public OBS overlays are listed below."}
        </p>
      </header>

      <section className="panel studio-games-panel">
        <h2>Dom the Don · Neon Stage</h2>
        <p className="hint">
          Blue neon stage with default Your Case / Dom box / briefcases backdrops. Change those
          images in Owner Setup. Existing Dom OBS links keep working.
        </p>
        <div className="studio-games-grid size-chooser-grid">
          <article className="studio-game-card size-choice-card">
            <div className="size-preview landscape" aria-hidden="true">
              <span />
            </div>
            <div>
              <h3>16:9 Widescreen</h3>
              <p>Desktop host view and landscape OBS. Best for monitor / horizontal canvases.</p>
            </div>
            <Link className="btn gold" href="/just-in-case/widescreen">
              Play Dom 16:9
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
            <Link className="btn gold" href="/just-in-case/vertical">
              Play Dom 9:16
            </Link>
          </article>
        </div>
      </section>

      <section className="panel studio-games-panel">
        <h2>Vault template</h2>
        <p className="hint">
          Classic brass / banker look (not neon). Banker wording instead of Dom. Optional custom
          backdrops in Owner Setup. Does not change your Dom routes or OBS links.
        </p>
        <div className="studio-games-grid size-chooser-grid">
          <article className="studio-game-card size-choice-card">
            <div className="size-preview landscape" aria-hidden="true">
              <span />
            </div>
            <div>
              <h3>16:9 Widescreen</h3>
              <p>Vault banker stage for landscape OBS / desktop.</p>
            </div>
            <Link className="btn gold" href="/just-in-case/vault/widescreen">
              Play Vault 16:9
            </Link>
          </article>

          <article className="studio-game-card size-choice-card">
            <div className="size-preview portrait" aria-hidden="true">
              <span />
            </div>
            <div>
              <h3>9:16 Vertical</h3>
              <p>Vault banker stage for TikTok / phone portrait OBS.</p>
            </div>
            <Link className="btn gold" href="/just-in-case/vault/vertical">
              Play Vault 9:16
            </Link>
          </article>
        </div>
      </section>

      {!publicAccess ? (
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
                  <h3>Dom 16:9</h3>
                  <p className="hint overlay-path">{session.overlays.widescreen.full}</p>
                </div>
                <div className="btn-row wrap">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copy(session.overlays!.widescreen.cases, "Dom 16:9 briefcases")}
                  >
                    Copy briefcases
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copy(session.overlays!.widescreen.player, "Dom 16:9 your case")}
                  >
                    Copy your case
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copy(session.overlays!.widescreen.offer, "Dom 16:9 offer")}
                  >
                    Copy Dom’s offer
                  </button>
                </div>
              </article>

              <article className="studio-game-card">
                <div>
                  <h3>Dom 9:16</h3>
                  <p className="hint overlay-path">{session.overlays.vertical.full}</p>
                </div>
                <div className="btn-row wrap">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copy(session.overlays!.vertical.cases, "Dom 9:16 briefcases")}
                  >
                    Copy briefcases
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copy(session.overlays!.vertical.player, "Dom 9:16 your case")}
                  >
                    Copy your case
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void copy(session.overlays!.vertical.offer, "Dom 9:16 offer")}
                  >
                    Copy Dom’s offer
                  </button>
                </div>
              </article>

              {session.overlays.vault ? (
                <>
                  <article className="studio-game-card">
                    <div>
                      <h3>Vault 16:9</h3>
                      <p className="hint overlay-path">{session.overlays.vault.widescreen.full}</p>
                    </div>
                    <div className="btn-row wrap">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          void copy(session.overlays!.vault.widescreen.cases, "Vault 16:9 briefcases")
                        }
                      >
                        Copy briefcases
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          void copy(session.overlays!.vault.widescreen.player, "Vault 16:9 your case")
                        }
                      >
                        Copy your case
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          void copy(session.overlays!.vault.widescreen.offer, "Vault 16:9 offer")
                        }
                      >
                        Copy Banker’s offer
                      </button>
                    </div>
                  </article>

                  <article className="studio-game-card">
                    <div>
                      <h3>Vault 9:16</h3>
                      <p className="hint overlay-path">{session.overlays.vault.vertical.full}</p>
                    </div>
                    <div className="btn-row wrap">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          void copy(session.overlays!.vault.vertical.cases, "Vault 9:16 briefcases")
                        }
                      >
                        Copy briefcases
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          void copy(session.overlays!.vault.vertical.player, "Vault 9:16 your case")
                        }
                      >
                        Copy your case
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          void copy(session.overlays!.vault.vertical.offer, "Vault 9:16 offer")
                        }
                      >
                        Copy Banker’s offer
                      </button>
                    </div>
                  </article>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="btn-row" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => void rotateLinks()}
            >
              Rotate public links
            </button>
          </div>
          {note ? <p className="hint">{note}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
