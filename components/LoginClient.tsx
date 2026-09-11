"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  firebaseConfigured,
  getSiteFaceAuth,
  loginWithEmail,
  onAuthStateChanged,
  registerWithEmail,
  signInWithGoogle,
} from "../lib/siteface-auth";

export default function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const configured = firebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(getSiteFaceAuth(), (user) => {
      if (user) router.replace("/account");
    });
  }, [configured, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "REGISTER") {
        await registerWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sf19-auth-page">
      <section className="sf19-auth-card">
        <div className="sf19-auth-brand">
          <span className="sf19-auth-orb">SAV</span>
          <div>
            <p className="sf19-eyebrow">Visual Intelligence</p>
            <h1>{mode === "LOGIN" ? "Welcome back" : "Create your account"}</h1>
          </div>
        </div>

        <p className="sf19-auth-intro">
          Sign in to save analyses, build your item collection and unlock future value tracking.
        </p>

        {!configured && (
          <div className="sf19-config-warning">
            Firebase authentication is not configured yet. Add the NEXT_PUBLIC_FIREBASE_* values
            to <code>.env.local</code> before testing login.
          </div>
        )}

        <button
          type="button"
          className="sf19-google-button"
          onClick={google}
          disabled={busy || !configured}
        >
          <span className="sf19-google-mark">G</span>
          Continue with Google
        </button>

        <div className="sf19-divider"><span>or</span></div>

        <form onSubmit={submit} className="sf19-auth-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={busy}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "REGISTER" ? "new-password" : "current-password"}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              required
              disabled={busy}
            />
          </label>

          {error && <div className="sf19-auth-error">{error}</div>}

          <button className="sf19-primary-button" disabled={busy || !configured}>
            {busy ? "Please wait..." : mode === "LOGIN" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="sf19-mode-link"
          onClick={() => setMode(mode === "LOGIN" ? "REGISTER" : "LOGIN")}
          disabled={busy}
        >
          {mode === "LOGIN"
            ? "New to AskSAV? Create an account"
            : "Already have an account? Sign in"}
        </button>

        <p className="sf19-auth-footnote">
          Your account will start on the Free plan. Payments are not enabled in v0.19.
        </p>
      </section>
    </main>
  );
}
