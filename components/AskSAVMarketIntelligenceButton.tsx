"use client";

import { useState } from "react";
import { getSiteFaceAuth } from "../lib/siteface-auth";

type Props = {
  analysis: Record<string, unknown>;
};

export default function AskSAVMarketIntelligenceButton({ analysis }: Props) {
  const [working, setWorking] = useState(false);
  const [market, setMarket] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");

  async function runMarketIntelligence() {
    if (working) return;

    setWorking(true);
    setError("");

    try {
      const user = getSiteFaceAuth().currentUser;

      if (!user) {
        throw new Error("Sign in to run Market Intelligence.");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/v20/market-intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysis }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            "Unable to generate Market Intelligence.",
        );
      }

      setMarket(payload?.market ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate Market Intelligence.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (market) {
    return (
      <section className="asksav-market-demand asksav-market-demand--ready">
        <div>
          <span className="asksav-market-demand__eyebrow">MARKET INTELLIGENCE</span>
          <h3>Market research complete</h3>
          <p>
            {market.evidence_summary ||
              "AskSAV completed the optional market research for this item."}
          </p>
        </div>

        {(market.low != null || market.high != null) && (
          <strong className="asksav-market-demand__range">
            {market.currency === "GBP" ? "Â£" : ""}
            {market.low ?? "?"}
            {" â€“ "}
            {market.currency === "GBP" ? "Â£" : ""}
            {market.high ?? "?"}
          </strong>
        )}
      </section>
    );
  }

  return (
    <section className="asksav-market-demand">
      <div>
        <span className="asksav-market-demand__eyebrow">
          OPTIONAL MARKET INTELLIGENCE
        </span>
        <h3>Want to know what it may be worth?</h3>
        <p>
          Run Market Intelligence separately for indicative UK pricing and
          supporting market context. Your main item analysis is already complete.
        </p>
      </div>

      <button
        type="button"
        onClick={runMarketIntelligence}
        disabled={working}
      >
        {working ? "Researching marketâ€¦" : "Get Market Intelligence"}
      </button>

      {working && (
        <p className="asksav-market-demand__progress">
          Checking current market context. This may take a little longer.
        </p>
      )}

      {error && (
        <p className="asksav-market-demand__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}