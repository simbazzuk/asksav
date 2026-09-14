"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  firebaseConfigured,
  getSiteFaceAuth,
  getSiteFaceUserRecord,
  logoutSiteFace,
  onAuthStateChanged,
  type SiteFaceEntitlements,
  type SiteFacePlan,
  type SiteFaceUserRecord,
} from "../lib/siteface-auth";

type ServerEntitlementState = {
  plan: SiteFacePlan;
  entitlements: SiteFaceEntitlements;
  usage: {
    analysesUsed: number;
    analysesLimit: number | "FAIR_USE";
    remaining: number | "FAIR_USE";
    periodKey: string;
  };
};

function entitlement(value: unknown) {
  if (value === true) return "Included";
  if (value === false) return "Not included";
  if (value === "FAIR_USE") return "Fair use";
  if (value === "UNLIMITED") return "Unlimited";
  return String(value ?? "-");
}

function planName(plan: SiteFacePlan) {
  return plan === "VIC_PLUS" ? "AskSAV+" : plan === "VIC_PRO" ? "AskSAV Pro" : "Free";
}

function formatUsagePeriod(periodKey?: string) {
  const value = String(periodKey || "").trim();
  const match = value.match(/^(\\d{4})-(\\d{2})/);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function AccountClient() {
  const router = useRouter();
  const [record, setRecord] = useState<SiteFaceUserRecord | null>(null);
  const [serverState, setServerState] = useState<ServerEntitlementState | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageWarning, setUsageWarning] = useState("");

  useEffect(() => {
    if (!firebaseConfigured()) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(getSiteFaceAuth(), async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const localRecord = await getSiteFaceUserRecord(user);
        setRecord(localRecord);

        const idToken = await user.getIdToken();
        const response = await fetch("/api/v20/entitlements", {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: "no-store",
        });

        if (response.ok) {
          setServerState(await response.json());
          setUsageWarning("");
        } else {
          const payload = await response.json().catch(() => ({}));
          setUsageWarning(payload.error || "Server usage information is temporarily unavailable.");
        }
      } catch (error) {
        console.error("[AskSAV] Account entitlement load failed", error);
        setUsageWarning("Server usage information is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  async function logout() {
    await logoutSiteFace();
    router.push("/");
  }

  if (loading) {
    return <main className="sf19-account-page"><div className="sf19-account-loading">Loading account...</div></main>;
  }

  if (!firebaseConfigured()) {
    return (
      <main className="sf19-account-page">
        <section className="sf19-account-panel">
          <h1>Account setup required</h1>
          <p>Add your Firebase web app configuration to <code>.env.local</code>, then restart Next.js.</p>
        </section>
      </main>
    );
  }

  if (!record) return null;

  const plan = serverState?.plan ?? record.plan;
  const entitlements = serverState?.entitlements ?? record.entitlements;
  const analysesUsed = serverState?.usage.analysesUsed ?? record.analysisCount;
  const analysesLimit = serverState?.usage.analysesLimit ?? entitlements.monthlyAnalyses;
  const remaining = serverState?.usage.remaining ?? (
    typeof analysesLimit === "number" ? Math.max(0, analysesLimit - analysesUsed) : "FAIR_USE"
  );

  const usagePercent =
    typeof analysesLimit !== "number"
      ? 8
      : analysesLimit <= 0
        ? 100
        : Math.min(100, (analysesUsed / analysesLimit) * 100);

  const limitReached = typeof analysesLimit === "number" && analysesUsed >= analysesLimit;

  const initials = (record.displayName || record.email || "VI")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="sf19-account-page">
      <section className="sf19-account-hero">
        <div className="sf19-avatar">{initials || "VI"}</div>
        <div className="sf19-account-title">
          <p className="sf19-eyebrow">My Account</p>
          <h1>{record.displayName || "Your AskSAV account"}</h1>
          <p>{record.email}</p>
        </div>
        <button className="sf19-secondary-button" onClick={logout}>Sign out</button>
      </section>

      {usageWarning ? (
        <section className="sf19-account-panel" style={{ marginBottom: 18 }}>
          <strong>Usage status</strong>
          <p>{usageWarning}</p>
        </section>
      ) : null}

      <section className="sf19-account-grid">
        <article className="sf19-plan-card">
          <div className="sf19-plan-top">
            <div>
              <p className="sf19-eyebrow">Current plan</p>
              <h2>{planName(plan)}</h2>
            </div>
            <span className={`sf19-plan-pill sf19-plan-pill--${plan.toLowerCase()}`}>
              {planName(plan)}
            </span>
          </div>
          <p>
            Your plan includes a monthly analysis allowance plus features designed to help you identify, understand and value your items.
          </p>
          <small style={{ color: "#64748b" }}>
            You can see your current usage and included features below.
          </small>
        </article>

        <article className="sf19-usage-card">
          <p className="sf19-eyebrow">This month</p>
          <h2>{analysesUsed}{typeof analysesLimit === "number" ? ` / ${analysesLimit}` : ""}</h2>
          <p>
            {remaining === "FAIR_USE" ? "Fair-use analysis allowance" : `${remaining} analyses remaining`}
          </p>
          <div className="sf19-usage-meter">
            <span style={{ width: `${usagePercent}%` }} />
          </div>
          {serverState?.usage.periodKey ? (
            <small style={{ display: "block", marginTop: 10, color: "#64748b" }}>
              Resets monthly · {formatUsagePeriod(serverState?.usage?.periodKey)}
            </small>
          ) : null}
        </article>
      </section>

      {limitReached ? (
        <section className="sf19-account-panel" style={{ marginBottom: 22, borderColor: "rgba(124,58,237,.25)" }}>
          <p className="sf19-eyebrow">Monthly allowance reached</p>
          <h2>You've used all {analysesLimit} analyses on your {planName(plan)} plan.</h2>
          <p>
            Your allowance will refresh next month. Upgrade options are coming soon if you need more analyses.
          </p>
        </section>
      ) : null}

      <section className="sf19-entitlements-panel">
        <div className="sf19-section-heading">
          <div>
            <p className="sf19-eyebrow">Your plan</p>
            <h2>What your plan includes</h2>
          </div>
          <span>{planName(plan)}</span>
        </div>

        <div className="sf19-entitlement-grid">
          <div><span>Monthly analyses</span><strong>{entitlement(entitlements.monthlyAnalyses)}</strong></div>
          <div><span>Saved items</span><strong>{entitlement(entitlements.savedItems)}</strong></div>
          <div><span>Full market evidence</span><strong>{entitlement(entitlements.fullMarketEvidence)}</strong></div>
          <div><span>Value history</span><strong>{entitlement(entitlements.valueHistory)}</strong></div>
          <div><span>Value alerts</span><strong>{entitlement(entitlements.valueAlerts)}</strong></div>
          <div><span>Selling tools</span><strong>{entitlement(entitlements.sellingTools)}</strong></div>
        </div>
      </section>

      <section className="sf19-account-next">
        <div>
          <p className="sf19-eyebrow">Make the most of AskSAV</p>
          <h2>See it. Know it. Value it.</h2>
          <p>
            Analyse another item to identify what it is, assess its condition and understand its indicative market value.
          </p>
        </div>
        <a href="/analyse" className="sf19-primary-link">Analyse an item</a>
      </section>
    </main>
  );
}
