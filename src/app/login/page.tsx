"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    setLoading(false);
    if (result?.error) {
      setError(
        result.error === "Configuration"
          ? "Login is misconfigured. Check AUTH_SECRET / AUTH_URL on Railway."
          : "Invalid email or password",
      );
      return;
    }
    if (result?.url) {
      router.push(result.url);
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <BrandHeader compact showBanner={false} />
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Operator login</h1>
        <p className="hint">Sign in with your email to manage Dom the Don Viewer Games.</p>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn gold wide" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="auth-switch">
          New here? <a href="/register">Create an account</a>
        </p>
        <p className="auth-switch">
          Playing on stream? Use the{" "}
          <a href="/just-in-case/vertical">public 9:16 game</a> (no login).
        </p>
      </form>
    </main>
  );
}
