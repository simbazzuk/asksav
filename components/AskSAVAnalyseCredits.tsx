"use client";

import { useEffect, useState } from "react";
import { getSiteFaceAuth } from "../lib/siteface-auth";

type CreditState = {
  remaining: number | null;
  limit: number | null;
  loading: boolean;
};

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readCredits(payload: any) {
  const roots = [
    payload,
    payload?.usage,
    payload?.analysisUsage,
    payload?.analysis_usage,
    payload?.allowance,
    payload?.planUsage,
    payload?.plan_usage,
    payload?.data,
  ].filter(Boolean);

  for (const root of roots) {
    const remaining =
      numberOrNull(root?.remaining) ??
      numberOrNull(root?.analysesRemaining) ??
      numberOrNull(root?.analyses_remaining) ??
      numberOrNull(root?.analysisRemaining) ??
      numberOrNull(root?.analysis_remaining) ??
      numberOrNull(root?.creditsRemaining) ??
      numberOrNull(root?.credits_remaining);

    const limit =
      numberOrNull(root?.limit) ??
      numberOrNull(root?.monthlyLimit) ??
      numberOrNull(root?.monthly_limit) ??
      numberOrNull(root?.analysisLimit) ??
      numberOrNull(root?.analysis_limit) ??
      numberOrNull(root?.included);

    const used =
      numberOrNull(root?.used) ??
      numberOrNull(root?.analysesUsed) ??
      numberOrNull(root?.analyses_used) ??
      numberOrNull(root?.analysisUsed) ??
      numberOrNull(root?.analysis_used);

    if (remaining !== null) return { remaining: Math.max(0, remaining), limit };
    if (limit !== null && used !== null) {
      return { remaining: Math.max(0, limit - used), limit };
    }
  }

  return { remaining: null, limit: null };
}

export default function AskSAVAnalyseCredits() {
  const [state, setState] = useState<CreditState>({
    remaining: null,
    limit: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getSiteFaceAuth().currentUser;
        if (!user) {
          if (active) setState({ remaining: null, limit: null, loading: false });
          return;
        }

        const token = await user.getIdToken();
        const response = await fetch("/api/v20/entitlements", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error("usage request failed");

        const credits = readCredits(payload);
        if (active) setState({ ...credits, loading: false });
      } catch {
        // Informational UI only: never block Analyse if usage cannot be loaded.
        if (active) setState({ remaining: null, limit: null, loading: false });
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  if (state.loading || state.remaining === null) return null;

  const low = state.remaining <= 2 && state.remaining > 0;
  const empty = state.remaining <= 0;
  const label = empty
    ? "No analyses left"
    : state.remaining === 1
      ? "1 analysis left"
      : `${state.remaining} analyses left`;

  return (
    <a
      className={`asksav-analysis-credits-v02039${empty ? " empty" : low ? " low" : ""}`}
      href="/account"
      title={state.limit ? `${state.remaining} of ${state.limit} monthly analyses remaining` : label}
      aria-label={`${label}. View account usage.`}
    >
      <span className="asksav-analysis-credits-v02039__icon" aria-hidden="true">&#10022;</span>
      <span>
        <strong>{label}</strong>
        <small>{empty ? "View plans" : "Monthly allowance"}</small>
      </span>
      <span className="asksav-analysis-credits-v02039__arrow" aria-hidden="true">&#8250;</span>
    </a>
  );
}
