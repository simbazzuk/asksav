"use client";

import { useEffect, useState } from "react";
import { getSiteFaceAuth } from "../lib/siteface-auth";

type Plan = "FREE" | "ASKSAV_PLUS" | "ASKSAV_PRO";

type AccountState = {
  plan: Plan;
  usage: {
    analysesUsed: number;
    analysesLimit: number | "FAIR_USE";
    remaining: number | "FAIR_USE";
    periodKey: string;
  };
};

function label(plan: Plan) {
  if (plan === "ASKSAV_PLUS") return "AskSAV Plus";
  if (plan === "ASKSAV_PRO") return "AskSAV Pro";
  return "AskSAV Free";
}

export default function AskSAVPlansPanel() {
  const [state, setState] = useState<AccountState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const auth = getSiteFaceAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) return;
      if (!user) {
        setState(null);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/v20/entitlements", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to load plan.");

        // Accept either a direct account-state response or a state envelope.
        const next = payload?.state ?? payload;
        if (active) setState(next as AccountState);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load plan.");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (error) {
    return <section className="asksav-plans-shell"><p className="asksav-plans-error">{error}</p></section>;
  }

  if (!state) {
    return <section className="asksav-plans-shell"><div className="asksav-plan-loading">Loading your AskSAV plan...</div></section>;
  }

  const used = Number(state.usage?.analysesUsed || 0);
  const limit = state.usage?.analysesLimit;
  const remaining = state.usage?.remaining;
  const percent =
    typeof limit === "number" && limit > 0
      ? Math.min(100, Math.max(0, Math.round((used / limit) * 100)))
      : 0;

  const cards = [
    {
      plan: "FREE" as Plan,
      name: "AskSAV Free",
      price: "\u00A3" + "0",
      suffix: "forever",
      features: ["5 analyses / month", "5 saved items"],
      locked: ["Market Intelligence"],
    },
    {
      plan: "ASKSAV_PLUS" as Plan,
      name: "AskSAV Plus",
      price: "Coming soon",
      suffix: "",
      popular: true,
      features: ["50 analyses / month", "100 saved items", "Market Intelligence", "Value History"],
      locked: ["Value Alerts"],
    },
    {
      plan: "ASKSAV_PRO" as Plan,
      name: "AskSAV Pro",
      price: "Coming soon",
      suffix: "",
      features: ["Fair-use analyses", "Unlimited saved items", "Full Market Intelligence", "Value History", "Value Alerts"],
      locked: [],
    },
  ];

  return (
    <section className="asksav-plans-shell" id="asksav-plans">
      <div className="asksav-plan-summary">
        <div className="asksav-plan-summary__copy">
          <span className="asksav-plan-kicker">YOUR PLAN</span>
          <div className="asksav-plan-summary__title">
            <h2>{label(state.plan)}</h2>
            <span className="asksav-current-pill">Current plan</span>
          </div>
          <p>
            {typeof limit === "number"
              ? `${used} of ${limit} analyses used this month Â· ${remaining} remaining`
              : `${used} analyses used this month Â· Fair-use allowance`}
          </p>
        </div>
        {typeof limit === "number" && (
          <div className="asksav-usage" aria-label={`${percent}% of monthly analyses used`}>
            <div className="asksav-usage__labels">
              <span>Monthly usage</span>
              <strong>{percent}%</strong>
            </div>
            <div className="asksav-usage__track">
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="asksav-plans-heading">
        <div>
          <span className="asksav-plan-kicker">PLANS</span>
          <h2>Choose the level of insight you need</h2>
          <p>Core identification stays simple. Upgrade when you want deeper market intelligence and history.</p>
        </div>
      </div>

      <div className="asksav-plan-grid">
        {cards.map((card) => {
          const current = state.plan === card.plan;
          return (
            <article
              className={`asksav-plan-card${card.popular ? " asksav-plan-card--popular" : ""}${current ? " asksav-plan-card--current" : ""}`}
              key={card.plan}
            >
              {card.popular && <span className="asksav-popular-badge">MOST POPULAR</span>}
              <div className="asksav-plan-card__top">
                <span className="asksav-plan-card__eyebrow">{current ? "CURRENT PLAN" : card.name}</span>
                <h3>{card.name}</h3>
                <div className="asksav-plan-price">
                  <strong>{card.price}</strong>
                  {card.suffix && <span>{card.suffix}</span>}
                </div>
              </div>

              <div className="asksav-plan-features">
                {card.features.map((feature) => (
                  <div className="asksav-plan-feature" key={feature}>
                    <span className="asksav-feature-icon" aria-hidden="true">{"\u2713"}</span>
                    <span>{feature}</span>
                  </div>
                ))}
                {card.locked.map((feature) => (
                  <div className="asksav-plan-feature asksav-plan-feature--locked" key={feature}>
                    <span className="asksav-feature-icon" aria-hidden="true">{"\u00D7"}</span>
                    <span>{feature} locked</span>
                  </div>
                ))}
              </div>

              <button
                className={`asksav-plan-action${current ? " asksav-plan-action--current" : ""}`}
                disabled
                type="button"
              >
                {current ? "Current plan" : "Coming soon"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
