"use client";

import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";

export function JustInCaseSizeChooser() {
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
        <p>Choose the game size before you enter. You can switch layouts later from inside the game.</p>
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
              Enter 16:9
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
              Enter 9:16
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
