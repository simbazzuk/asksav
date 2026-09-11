"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  firebaseConfigured,
  getSiteFaceAuth,
  getSiteFaceUserRecord,
  logoutSiteFace,
  onAuthStateChanged,
  type SiteFaceUserRecord,
} from "../lib/siteface-auth";

function entitlement(value: unknown) {
  if (value === true) return "Included";
  if (value === false) return "Not included";
  if (value === "FAIR_USE") return "Fair use";
  if (value === "UNLIMITED") return "Unlimited";
  return String(value ?? "-");
}

export default function AccountClient() {
  const router = useRouter();
  const [record, setRecord] = useState<SiteFaceUserRecord | null>(null);
  const [loading, setLoading] = useState(true);

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
        setRecord(await getSiteFaceUserRecord(user));
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

      <section className="sf19-account-grid">
        <article className="sf19-plan-card">
          <div className="sf19-plan-top">
            <div>
              <p className="sf19-eyebrow">Current plan</p>
              <h2>{record.plan === "VIC_PLUS" ? "VIC+" : record.plan === "VIC_PRO" ? "VIC Pro" : "Free"}</h2>
            </div>
            <span className={`sf19-plan-pill sf19-plan-pill--${record.plan.toLowerCase()}`}>
              {record.plan.replace("_", " ")}
            </span>
          </div>
          <p>
            v0.19 creates the account and entitlement foundation. Pricing and plan switching arrive in v0.20.
          </p>
        </article>

        <article className="sf19-usage-card">
          <p className="sf19-eyebrow">Usage</p>
          <h2>{record.analysisCount}</h2>
          <p>Analyses recorded against your account</p>
          <div className="sf19-usage-meter">
            <span
              style={{
                width:
                  typeof record.entitlements.monthlyAnalyses === "number"
                    ? `${Math.min(100, (record.analysisCount / record.entitlements.monthlyAnalyses) * 100)}%`
                    : "8%",
              }}
            />
          </div>
        </article>
      </section>

      <section className="sf19-entitlements-panel">
        <div className="sf19-section-heading">
          <div>
            <p className="sf19-eyebrow">Entitlements</p>
            <h2>What your plan includes</h2>
          </div>
          <span>v0.20 ready</span>
        </div>

        <div className="sf19-entitlement-grid">
          <div><span>Monthly analyses</span><strong>{entitlement(record.entitlements.monthlyAnalyses)}</strong></div>
          <div><span>Saved items</span><strong>{entitlement(record.entitlements.savedItems)}</strong></div>
          <div><span>Full market evidence</span><strong>{entitlement(record.entitlements.fullMarketEvidence)}</strong></div>
          <div><span>Value history</span><strong>{entitlement(record.entitlements.valueHistory)}</strong></div>
          <div><span>Value alerts</span><strong>{entitlement(record.entitlements.valueAlerts)}</strong></div>
          <div><span>Selling tools</span><strong>{entitlement(record.entitlements.sellingTools)}</strong></div>
        </div>
      </section>

      <section className="sf19-account-next">
        <div>
          <p className="sf19-eyebrow">Coming next</p>
          <h2>Plans, pricing and entitlement controls</h2>
          <p>
            The account record already carries plan and entitlement data, so v0.20 can enforce
            Free, VIC+ and VIC Pro capabilities without redesigning authentication.
          </p>
        </div>
        <a href="/analyse" className="sf19-primary-link">Analyse an item</a>
      </section>
    </main>
  );
}
