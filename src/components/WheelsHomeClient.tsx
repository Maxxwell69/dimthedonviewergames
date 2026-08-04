"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandHeader } from "@/components/BrandHeader";
import type { WheelSummaryDTO } from "@/lib/types";

type WheelsHomeClientProps = {
  initialWheels: WheelSummaryDTO[];
  userName: string;
  userEmail: string;
};

export function WheelsHomeClient({
  initialWheels,
  userName,
  userEmail,
}: WheelsHomeClientProps) {
  const router = useRouter();
  const [wheels, setWheels] = useState(initialWheels);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/wheels", { cache: "no-store" });
    const data = (await res.json()) as { wheels?: WheelSummaryDTO[]; error?: string };
    if (!res.ok) throw new Error(data.error || "Failed to load wheels");
    setWheels(data.wheels ?? []);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wheels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "New Wheel",
          description: description.trim(),
        }),
      });
      const data = (await res.json()) as { wheel?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not create wheel");
      setTitle("");
      setDescription("");
      await refresh();
      if (data.wheel?.id) router.push(`/dashboard/wheels/${data.wheel.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(wheel: WheelSummaryDTO) {
    setBusy(true);
    try {
      const res = await fetch(`/api/wheels/${wheel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !wheel.isActive }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Update failed");
      }
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeWheel(wheel: WheelSummaryDTO) {
    if (!window.confirm(`Delete “${wheel.title}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/wheels/${wheel.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const active = wheels.filter((w) => w.isActive);
  const inactive = wheels.filter((w) => !w.isActive);

  return (
    <div className="home-shell">
      <div className="home-top">
        <BrandHeader compact showBanner={false} />
        <div className="home-user">
          <div>
            <strong>{userName}</strong>
            <span>{userEmail}</span>
          </div>
          <button type="button" className="btn ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </div>

      <header className="home-hero">
        <h1>Your wheels</h1>
        <p>Create multiple giveaway wheels, design each one, and activate the ones you&apos;re running live.</p>
      </header>

      <section className="panel studio-games-panel">
        <h2>Studio games</h2>
        <p className="hint">
          Operator-only games. These run separately from your wheels and never touch wheel entries or display URLs.
        </p>
        <div className="studio-games-grid">
          <article className="studio-game-card">
            <div>
              <h3>Just in Case</h3>
              <p>
                Public game — Dom template plus a separate Vault banker template. Open the chooser,
                then copy overlay URLs from Owner Setup (never paste a /dashboard link into Studio).
              </p>
            </div>
            <div className="btn-row wrap">
              <Link className="btn gold" href="/just-in-case">
                Choose template
              </Link>
              <Link className="btn ghost" href="/just-in-case/vertical">
                Dom 9:16
              </Link>
              <Link className="btn ghost" href="/just-in-case/vault/vertical">
                Vault 9:16
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="panel create-wheel-panel">
        <h2>New wheel</h2>
        <form className="create-wheel-form" onSubmit={onCreate}>
          <label className="field">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday Giveaway"
              maxLength={80}
            />
          </label>
          <label className="field">
            Short description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Subs-only wheel for tonight’s live"
              maxLength={160}
            />
          </label>
          <button className="btn gold" type="submit" disabled={busy}>
            Create wheel
          </button>
        </form>
      </section>

      <section className="wheel-list-section">
        <h2>Active ({active.length})</h2>
        {active.length === 0 ? (
          <p className="hint">No active wheels yet. Create one above.</p>
        ) : (
          <div className="wheel-card-grid">
            {active.map((wheel) => (
              <article key={wheel.id} className="wheel-card">
                <div
                  className="wheel-card-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${wheel.colorPrimary}, ${wheel.colorSecondary})`,
                    borderColor: wheel.colorAccent,
                  }}
                />
                <div className="wheel-card-body">
                  <h3>{wheel.title}</h3>
                  <p>{wheel.description || "No description yet."}</p>
                  <p className="wheel-card-meta">
                    {wheel.entryCount} entered · updated{" "}
                    {new Date(wheel.updatedAt).toLocaleString()}
                  </p>
                  <div className="btn-row">
                    <Link className="btn gold" href={`/dashboard/wheels/${wheel.id}`}>
                      Open
                    </Link>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy}
                      onClick={() => toggleActive(wheel)}
                    >
                      Deactivate
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy}
                      onClick={() => removeWheel(wheel)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {inactive.length > 0 ? (
        <section className="wheel-list-section">
          <h2>Inactive ({inactive.length})</h2>
          <div className="wheel-card-grid">
            {inactive.map((wheel) => (
              <article key={wheel.id} className="wheel-card dimmed">
                <div
                  className="wheel-card-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${wheel.colorPrimary}, ${wheel.colorSecondary})`,
                    borderColor: wheel.colorAccent,
                  }}
                />
                <div className="wheel-card-body">
                  <h3>{wheel.title}</h3>
                  <p>{wheel.description || "No description yet."}</p>
                  <div className="btn-row">
                    <Link className="btn gold" href={`/dashboard/wheels/${wheel.id}`}>
                      Open
                    </Link>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy}
                      onClick={() => toggleActive(wheel)}
                    >
                      Activate
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy}
                      onClick={() => removeWheel(wheel)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
