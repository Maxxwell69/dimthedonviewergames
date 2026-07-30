"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Registration failed");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <BrandHeader compact showBanner={false} />
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <p className="hint">Sign up to build and run your viewer wheels.</p>
        <label className="field">
          Name
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="field">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn gold wide" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
