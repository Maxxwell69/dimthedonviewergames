"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { DonWheel } from "@/components/DonWheel";
import { WinnerOverlay } from "@/components/WinnerOverlay";
import Link from "next/link";
import { DEFAULT_WHEEL_COLORS, type WheelDTO } from "@/lib/types";

type DashboardClientProps = {
  initialWheel: WheelDTO;
};

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

function fileToHubDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function DashboardClient({ initialWheel }: DashboardClientProps) {
  const wheelId = initialWheel.id;
  const [wheel, setWheel] = useState(initialWheel);
  const [entriesText, setEntriesText] = useState(initialWheel.entriesText ?? "");
  const [description, setDescription] = useState(initialWheel.description ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [showWinner, setShowWinner] = useState(false);
  const [wheelSize, setWheelSize] = useState(520);
  const [testUsername, setTestUsername] = useState("webhook_test");

  useEffect(() => {
    setOrigin(window.location.origin);
    const resize = () => setWheelSize(Math.min(560, window.innerWidth - 48));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/wheels/${wheelId}/stream`);
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
        if (typeof payload.wheel.description === "string") {
          setDescription(payload.wheel.description);
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
  }, [wheelId]);

  // Polling fallback for Railway multi-instance / SSE gaps
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/wheels/${wheelId}`, { cache: "no-store" });
        const data = await readJson<{ wheel: WheelDTO }>(res);
        setWheel((prev) => {
          if (prev.updatedAt === data.wheel.updatedAt) return prev;
          if (typeof data.wheel.entriesText === "string") {
            setEntriesText(data.wheel.entriesText);
          }
          if (typeof data.wheel.description === "string") {
            setDescription(data.wheel.description);
          }
          if (data.wheel.currentWinner && !data.wheel.isSpinning) setShowWinner(true);
          return data.wheel;
        });
      } catch {
        // ignore
      }
    }, 2500);
    return () => clearInterval(id);
  }, [wheelId]);

  const displayUrl = useMemo(
    () => (origin && wheel.displayToken ? `${origin}/display/${wheel.displayToken}` : ""),
    [origin, wheel.displayToken],
  );

  const overlayUrl = useMemo(
    () => (displayUrl ? `${displayUrl}?overlay=1` : ""),
    [displayUrl],
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
      const res = await fetch(`/api/wheels/${wheelId}`, {
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
  }, [entriesText, wheelId]);

  const patchSettings = useCallback(async (patch: Partial<WheelDTO>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/wheels/${wheelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await readJson<{ wheel: WheelDTO }>(res);
      setWheel(data.wheel);
      if (typeof data.wheel.description === "string") {
        setDescription(data.wheel.description);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }, [wheelId]);

  const runAction = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/wheels/${wheelId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await readJson<{
        wheel: WheelDTO;
        label?: string;
        alreadyEntered?: boolean;
      }>(res);
      setWheel(data.wheel);
      if (typeof data.wheel.entriesText === "string") {
        setEntriesText(data.wheel.entriesText);
      }
      if (action === "dismissWinner") setShowWinner(false);
      if (action.startsWith("regenerate")) setMessage("New secret URL generated");
      if (action === "testEnter" && data.label) {
        setMessage(
          data.alreadyEntered
            ? `${data.label} already on the wheel (webhook path OK)`
            : `${data.label} entered via test (webhook path OK)`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }, [wheelId]);

  const testWebhookEnter = useCallback(async () => {
    const username = testUsername.trim() || "webhook_test";
    // Hit the real TikFinity webhook route first (what OBS/TikFinity should call).
    if (webhookUrl) {
      setBusy(true);
      setMessage(null);
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            nickname: username,
            userId: "dashboard-test",
            command: "!enter",
          }),
        });
        const data = await readJson<{
          ok?: boolean;
          label?: string;
          alreadyEntered?: boolean;
          error?: string;
        }>(res);
        if (data.label) {
          setMessage(
            data.alreadyEntered
              ? `${data.label} already on the wheel — webhook HIT`
              : `${data.label} entered — webhook HIT`,
          );
        } else {
          setMessage("Webhook HIT");
        }
        // Refresh wheel from server so the entry list updates immediately
        const wheelRes = await fetch(`/api/wheels/${wheelId}`, { cache: "no-store" });
        const wheelData = await readJson<{ wheel: WheelDTO }>(wheelRes);
        setWheel(wheelData.wheel);
        if (typeof wheelData.wheel.entriesText === "string") {
          setEntriesText(wheelData.wheel.entriesText);
        }
        return;
      } catch (error) {
        setMessage(
          error instanceof Error
            ? `Webhook test failed: ${error.message}`
            : "Webhook test failed",
        );
        return;
      } finally {
        setBusy(false);
      }
    }
    // Fallback if origin/URL not ready yet
    await runAction("testEnter", { username });
  }, [testUsername, webhookUrl, runAction, wheelId]);

  const spin = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setShowWinner(false);
    try {
      const res = await fetch(`/api/wheels/${wheelId}/spin`, { method: "POST" });
      const data = await readJson<{ wheel: WheelDTO }>(res);
      setWheel(data.wheel);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Spin failed");
    } finally {
      setBusy(false);
    }
  }, [wheelId]);

  const onHubImage = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const hubImageUrl = await fileToHubDataUrl(file);
      await patchSettings({ hubImageUrl });
      setMessage("Center image updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed");
      setBusy(false);
    }
  };

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
        <Link className="btn ghost" href="/dashboard">
          All wheels
        </Link>
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
          <label className="field" style={{ marginBottom: "0.75rem" }}>
            Short description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => patchSettings({ description })}
              placeholder="What this wheel is for"
              maxLength={160}
            />
          </label>

          <DonWheel
            entries={wheel.entries}
            isSpinning={wheel.isSpinning}
            targetAngle={wheel.spinTargetAngle}
            spinDurationMs={wheel.spinDurationMs}
            spinStartedAt={wheel.spinStartedAt}
            soundEnabled={wheel.soundEnabled}
            spinVolume={wheel.spinVolume ?? 80}
            interactive
            onRequestSpin={spin}
            onSpinComplete={() => setShowWinner(true)}
            size={wheelSize}
            colorPrimary={wheel.colorPrimary || DEFAULT_WHEEL_COLORS.colorPrimary}
            colorSecondary={wheel.colorSecondary || DEFAULT_WHEEL_COLORS.colorSecondary}
            colorAccent={wheel.colorAccent || DEFAULT_WHEEL_COLORS.colorAccent}
            hubImageUrl={wheel.hubImageUrl}
          />

          <WinnerOverlay
            winner={wheel.currentWinner}
            visible={showWinner && !wheel.isSpinning}
            celebrateEnabled={wheel.celebrateEnabled ?? true}
            celebrateVolume={wheel.celebrateVolume ?? 95}
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
            <h2>Design your wheel</h2>
            <div className="design-grid">
              <label className="field">
                Primary color
                <input
                  type="color"
                  value={wheel.colorPrimary || DEFAULT_WHEEL_COLORS.colorPrimary}
                  onChange={(e) =>
                    setWheel((w) => ({ ...w, colorPrimary: e.target.value }))
                  }
                  onBlur={(e) => patchSettings({ colorPrimary: e.target.value })}
                />
              </label>
              <label className="field">
                Secondary color
                <input
                  type="color"
                  value={wheel.colorSecondary || DEFAULT_WHEEL_COLORS.colorSecondary}
                  onChange={(e) =>
                    setWheel((w) => ({ ...w, colorSecondary: e.target.value }))
                  }
                  onBlur={(e) => patchSettings({ colorSecondary: e.target.value })}
                />
              </label>
              <label className="field">
                Accent / rim
                <input
                  type="color"
                  value={wheel.colorAccent || DEFAULT_WHEEL_COLORS.colorAccent}
                  onChange={(e) =>
                    setWheel((w) => ({ ...w, colorAccent: e.target.value }))
                  }
                  onBlur={(e) => patchSettings({ colorAccent: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              Center image
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => onHubImage(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() =>
                  patchSettings({
                    colorPrimary: DEFAULT_WHEEL_COLORS.colorPrimary,
                    colorSecondary: DEFAULT_WHEEL_COLORS.colorSecondary,
                    colorAccent: DEFAULT_WHEEL_COLORS.colorAccent,
                    hubImageUrl: null,
                  })
                }
              >
                Reset design
              </button>
            </div>
            <label className="check" style={{ marginTop: "0.85rem" }}>
              <input
                type="checkbox"
                checked={wheel.isActive ?? true}
                onChange={(e) => patchSettings({ isActive: e.target.checked })}
              />
              Active on dashboard
            </label>
          </section>

          <section className="panel">
            <h2>Settings</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={wheel.removeOnWin}
                onChange={(e) => patchSettings({ removeOnWin: e.target.checked })}
              />
              Remove winner after Continue
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
              Spin sound FX
            </label>
            <label className={`field volume-field ${wheel.soundEnabled ? "" : "disabled"}`}>
              Spin volume ({wheel.spinVolume ?? 80}%)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={!wheel.soundEnabled}
                value={wheel.spinVolume ?? 80}
                onChange={(e) =>
                  setWheel((w) => ({ ...w, spinVolume: Number(e.target.value) }))
                }
                onMouseUp={(e) =>
                  patchSettings({ spinVolume: Number((e.target as HTMLInputElement).value) })
                }
                onTouchEnd={(e) =>
                  patchSettings({ spinVolume: Number((e.target as HTMLInputElement).value) })
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={wheel.celebrateEnabled ?? true}
                onChange={(e) => patchSettings({ celebrateEnabled: e.target.checked })}
              />
              Celebrate (confetti + cheer)
            </label>
            <label
              className={`field volume-field ${wheel.celebrateEnabled ?? true ? "" : "disabled"}`}
            >
              Celebrate volume ({wheel.celebrateVolume ?? 95}%)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={!(wheel.celebrateEnabled ?? true)}
                value={wheel.celebrateVolume ?? 95}
                onChange={(e) =>
                  setWheel((w) => ({ ...w, celebrateVolume: Number(e.target.value) }))
                }
                onMouseUp={(e) =>
                  patchSettings({
                    celebrateVolume: Number((e.target as HTMLInputElement).value),
                  })
                }
                onTouchEnd={(e) =>
                  patchSettings({
                    celebrateVolume: Number((e.target as HTMLInputElement).value),
                  })
                }
              />
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
            <p className="hint">Full show page (logo + title + wheel).</p>
            <code className="url-box">{displayUrl || "Loading…"}</code>
            <div className="btn-row">
              <button
                type="button"
                className="btn gold"
                disabled={!displayUrl}
                onClick={() => copy(displayUrl, "Display URL")}
              >
                Copy full display URL
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

            <h2 style={{ marginTop: "1.1rem" }}>Wheel-only overlay</h2>
            <p className="hint">
              Just the wheel — transparent background for OBS Browser Source. No header or page chrome.
            </p>
            <code className="url-box">{overlayUrl || "Loading…"}</code>
            <div className="btn-row">
              <button
                type="button"
                className="btn gold"
                disabled={!overlayUrl}
                onClick={() => copy(overlayUrl, "Overlay URL")}
              >
                Copy overlay URL
              </button>
              <a className="btn ghost" href={overlayUrl || "#"} target="_blank" rel="noreferrer">
                Open overlay
              </a>
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
            <div className="webhook-test">
              <h3>Test webhook</h3>
              <p className="hint">
                Simulates TikFinity hitting this endpoint. If the name appears on the wheel, your app is fine — fix TikFinity config next.
              </p>
              <div className="btn-row webhook-test-row">
                <input
                  className="title-input test-user-input"
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  placeholder="test username"
                  aria-label="Test username"
                />
                <button
                  type="button"
                  className="btn gold"
                  disabled={busy}
                  onClick={testWebhookEnter}
                >
                  Test !enter
                </button>
              </div>
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
