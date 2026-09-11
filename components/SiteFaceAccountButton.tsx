"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  firebaseConfigured,
  getSiteFaceAuth,
  onAuthStateChanged,
} from "../lib/siteface-auth";

export default function SiteFaceAccountButton() {
  const [label, setLabel] = useState("Sign in");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured()) return;

    return onAuthStateChanged(getSiteFaceAuth(), (user) => {
      setSignedIn(Boolean(user));
      if (user) {
        setLabel(user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Account");
      } else {
        setLabel("Sign in");
      }
    });
  }, []);

  return (
    <Link
      className={`sf19-account-chip ${signedIn ? "sf19-account-chip--signed-in" : ""}`}
      href={signedIn ? "/account" : "/login"}
    >
      <span className="sf19-account-chip__icon">{signedIn ? "VI" : "→"}</span>
      <span>{label}</span>
    </Link>
  );
}
