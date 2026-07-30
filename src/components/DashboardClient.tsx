"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { DonWheel } from "@/components/DonWheel";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import type { WheelDTO } from "@/lib/types";

type DashboardClientProps = {
  initialWheel: WheelDTO;
};

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export function DashboardClient({ initialWheel }: DashboardClientProps) {
  const [wheel, setWheel] = useState(initialWheel);
  const [entriesText, setEntriesText] = useState(initialWheel.entriesText ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [showWinner, setShowWinner] = useState(false);
  const [wheelSize, setWheelSize] = useState(520);

  useEffect(() => {
    setOrigin(window.location.origin);
    const resize = () => setWheelSize(Math.min(560, window.innerWidth - 48));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/wheel/stream");
    es.addEventListener("wheel", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          type: string;
          wheel: WheelDTO;
          label?: string;
        };
        setWheel(payload.wheel);
        if (typeof payload.wheel.entriesText === "string") {
          setEntriesText(payload.wheel.entriesText);
        }
        if (payload.type === "enter" && payload.label) {
          setMessage(`${payload.label} entered the wheel`);
        }
        if (payload.type === "spin") setShowWinner(false);
        if (payload.type === "winner") setShowWinner(true);
      } catch {
        // ignore malformed events
      }
    });
    return () => es.close();
  }, []);

  // Polling fallback for Railway multi-instance / SSE gaps
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/wheel", { cache: "no-store" });
        const data = await readJson<{ wheel: WheelDTO }>(res);
        setWheel((prev) => {
          if (prev.updatedAt === data.wheel.updatedAt) return prev;
          if (typeof data.wheel.entriesText === "string") {
            setEntriesText(data.wheel.entriesText);
          }
          if (data.wheel.currentWinner && !data.wheel.isSpinning) setShowWinner(true);
          return data.wheel;
        });
      } catch {
        // ignore
      }
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const displayUrl = useMemo(
    () => (origin && wheel.displayToken ? `${origin}/display/${wheel.displayToken}` : ""),
    [origin, wheel.displayToken],
  );

  const webhookUrl = useMemo(
    () =>
      origin && wheel.webhookSecret
        ? `${origin}/api/webhooks/tikfinity?secret=${wheel.webhookSecret}`
        : "",
    [origin, wheel.webhookSecret],
  );

  const saveEntries = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wheel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entriesText }),
      });
      const data = await readJson<{ wheel: WheelDTO }>(res);
      setWheel(data.wheel);
      setEntriesText(data.wheel.entriesText ?? "");
      setMessage("Entries updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }, [entriesText]);

  const patchSettings = useCallback(async (patch: Partial<WheelDTO>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/wheel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await readJson<{ wheel: WheelDTO }>(res);
      setWheel(data.wheel);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const runAction = useCallback(async (action: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wheel/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await readJson<{ wheel: WheelDTO }>(res);
      setWheel(data.wheel);
      if (typeof data.wheel.entriesText === "string") {
        setEntriesText(data.wheel.entriesText);
      }
      if (action === "dismissWinner") setShowWinner(false);
      if (action.startsWith("regenerate")) setMessage("New secret URL generated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const spin = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setShowWinner(false);
    try {
      const res = await fetch("/api/wheel/spin", { method: "POST" });
      const data = await readJson<{ wheel: WheelDTO }>(res);
      setWheel(data.wheel);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Spin failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied`);
    } catch {
      setMessage("Could not copy — select the URL manually");
    }
  };

  return (
    <div className="dash-shell">
      <div className="dash-top">
        <BrandHeader compact showBanner={false} />
      </div>

      <div className="dash-grid">
        <section className="panel wheel-panel">
          <div className="panel-head">
            <input
              className="title-input"
              value={wheel.title}
              onChange={(e) => setWheel((w) => ({ ...w, title: e.target.value }))}
              onBlur={() => patchSettings({ title: wheel.title })}
            />
            <button
              type="button"
              className="btn gold"
              disabled={busy || wheel.isSpinning || wheel.entries.length < 1}
              onClick={spin}
            >
              {wheel.isSpinning ? "Spinning…" : "Spin"}
            </button>
          </div>

          <DonWheel
            entries={wheel.entries}
            isSpinning={wheel.isSpinning}
            targetAngle={wheel.spinTargetAngle}
            spinDurationMs={wheel.spinDurationMs}
            spinStartedAt={wheel.spinStartedAt}
            soundEnabled={wheel.soundEnabled}
            interactive
            onRequestSpin={spin}
            onSpinComplete={() => setShowWinner(true)}
            size={wheelSize}
          />

          <WinnerOverlay
            winner={wheel.currentWinner}
            visible={showWinner && !wheel.isSpinning}
            soundEnabled={wheel.soundEnabled}
            showControls
            onDismiss={() => runAction("dismissWinner")}
          />
        </section>

        <aside className="side-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Entries</h2>
              <div className="btn-row">
                <button type="button" className="btn ghost" disabled={busy} onClick={() => runAction("shuffle")}>
                  Shuffle
                </button>
                <button type="button" className="btn ghost" disabled={busy} onClick={() => runAction("clear")}>
                  Clear round
                </button>
                <button type="button" className="btn gold" disabled={busy} onClick={saveEntries}>
                  Update
                </button>
              </div>
            </div>
            <textarea
              className="entries-box"
              value={entriesText}
              onChange={(e) => setEntriesText(e.target.value)}
              placeholder={"@viewer1\n@viewer2\n@viewer3:2"}
              rows={14}
            />
            <p className="hint">
              One name per line. Optional weight: <code>@name:2</code>. Live chat uses{" "}
              <code>!enter</code> via TikFinity.
            </p>
            <p className="count">{wheel.entries.length} on the wheel</p>
          </section>

          <section className="panel">
            <h2>Settings</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={wheel.removeOnWin}
                onChange={(e) => patchSettings({ removeOnWin: e.target.checked })}
              />
              Remove winner after spin
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={wheel.allowDuplicates}
                onChange={(e) => patchSettings({ allowDuplicates: e.target.checked })}
              />
              Allow duplicate !enter as extra weight
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={wheel.soundEnabled}
                onChange={(e) => patchSettings({ soundEnabled: e.target.checked })}
              />
              Spin sound
            </label>
            <label className="field">
              Spin duration (ms)
              <input
                type="number"
                min={3000}
                max={20000}
                step={500}
                value={wheel.spinDurationMs}
                onChange={(e) =>
                  setWheel((w) => ({ ...w, spinDurationMs: Number(e.target.value) || 8000 }))
                }
                onBlur={() => patchSettings({ spinDurationMs: wheel.spinDurationMs })}
              />
            </label>
          </section>

          <section className="panel secret-panel">
            <h2>Display URL</h2>
            <p className="hint">Private OBS / streamer view — only shown while logged in.</p>
            <code className="url-box">{displayUrl || "Loading…"}</code>
            <div className="btn-row">
              <button
                type="button"
                className="btn gold"
                disabled={!displayUrl}
                onClick={() => copy(displayUrl, "Display URL")}
              >
                Copy display URL
              </button>
              <a className="btn ghost" href={displayUrl || "#"} target="_blank" rel="noreferrer">
                Open
              </a>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => runAction("regenerateDisplayToken")}
              >
                Rotate link
              </button>
            </div>
          </section>

          <section className="panel secret-panel">
            <h2>TikFinity webhook</h2>
            <ol className="setup-list">
              <li>Open TikFinity → Actions &amp; Events</li>
              <li>Create Action → Trigger Webhook</li>
              <li>Paste the webhook URL below</li>
              <li>
                JSON body:
                <pre>{`{
  "secret": "${wheel.webhookSecret ?? ""}",
  "username": "%username%",
  "nickname": "%nickname%",
  "userId": "%userId%"
}`}</pre>
              </li>
              <li>Create Event → Chat command <code>!enter</code> → trigger that action</li>
            </ol>
            <code className="url-box">{webhookUrl || "Loading…"}</code>
            <div className="btn-row">
              <button
                type="button"
                className="btn gold"
                disabled={!webhookUrl}
                onClick={() => copy(webhookUrl, "Webhook URL")}
              >
                Copy webhook URL
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => runAction("regenerateWebhookSecret")}
              >
                Rotate secret
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Recent winners</h2>
            {wheel.winners.length === 0 ? (
              <p className="hint">No winners yet.</p>
            ) : (
              <ul className="winner-list">
                {wheel.winners.map((w) => (
                  <li key={w.id}>
                    <span>{w.label}</span>
                    <time>{new Date(w.createdAt).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
