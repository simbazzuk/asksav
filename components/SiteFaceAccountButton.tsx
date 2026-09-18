"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  firebaseConfigured,
  getSiteFaceAuth,
  logoutSiteFace,
  onAuthStateChanged,
} from "../lib/siteface-auth";

export default function SiteFaceAccountButton() {
  const [label, setLabel] = useState("Sign in");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured()) return;

    return onAuthStateChanged(getSiteFaceAuth(), (user) => {
      setSignedIn(Boolean(user));
      if (user) {
        setLabel(
          user.displayName?.split(" ")[0] ||
            user.email?.split("@")[0] ||
            "Account",
        );
      } else {
        setLabel("Sign in");
      }
    });
  }, []);

  if (!signedIn) {
    return (
      <Link className="sf19-account-chip" href="/login">
        <span className="sf19-account-chip__icon">→</span>
        <span>Sign in</span>
      </Link>
    );
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await logoutSiteFace();
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sf20-auth-controls">
      <Link
        className="sf19-account-chip sf19-account-chip--signed-in"
        href="/account"
        aria-label="Open your AskSAV account"
      >
        <span className="sf19-account-chip__icon">VI</span>
        <span>{label}</span>
      </Link>

      <button
        type="button"
        className="sf20-signout-button"
        onClick={handleSignOut}
        disabled={busy}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
